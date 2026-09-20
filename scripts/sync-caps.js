#!/usr/bin/env node
/* ============================================================
 * sync-caps.js —— 从 OpenRouter 元数据同步「接口能力」到 data.js
 *
 * 与「语义能力标签（tags）」的区别：
 *   tags  = 人工判断「这个模型擅长什么」（代码生成、推理、多模态…）
 *   caps  = 机器可验证「这个模型接口上支持什么」（图像输入、工具调用…）
 *
 * caps 取值（来源：OpenRouter /api/v1/models 的 architecture.input_modalities
 *             与 supported_parameters，均为结构化字段，非人工推断）：
 *   vision    图像输入      input_modalities 含 image
 *   file      文件输入      input_modalities 含 file（PDF 等）
 *   audio     语音输入      input_modalities 含 audio
 *   video     视频输入      input_modalities 含 video
 *   tools     工具调用      supported_parameters 含 tools
 *   json      结构化输出    supported_parameters 含 structured_outputs 或 response_format
 *   reasoning 深度推理      supported_parameters 含 reasoning 或 include_reasoning
 *
 * 用法：
 *   node scripts/sync-caps.js --dry-run    只报告覆盖率，不写盘
 *   node scripts/sync-caps.js --apply      写回 data.js + deploy/data.js
 * ============================================================ */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { parseDataJs, matchModel, coreTokens } = require('./lib');

const ROOT = path.resolve(__dirname, '..');
const DATA_JS = path.join(ROOT, 'data.js');
const DEPLOY_DATA_JS = path.join(ROOT, 'deploy', 'data.js');
/** 人工核实名单：OpenRouter 未收录的模型，其 caps 由官方文档人工核对后维护在此 */
const MANUAL_JSON = path.join(__dirname, 'caps-manual.json');

const DRY = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');

const CAP_KEYS = ['vision', 'file', 'audio', 'video', 'tools', 'json', 'reasoning'];

function fetchJson(host, p) {
  return new Promise((res, rej) => {
    const req = https.get(
      { host, path: p, timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } },
      (r) => {
        const c = [];
        r.on('data', (d) => c.push(d));
        r.on('end', () => {
          try { res(JSON.parse(Buffer.concat(c).toString('utf8'))); } catch (e) { rej(e); }
        });
      },
    );
    req.on('error', rej);
    req.on('timeout', () => { req.destroy(); rej(new Error('timeout')); });
  });
}

/** 从一条 OpenRouter 记录推导 caps */
function deriveCaps(entry) {
  const arch = entry.architecture || {};
  const mods = arch.input_modalities || [];
  const sp = entry.supported_parameters || [];
  const caps = [];
  if (mods.includes('image')) caps.push('vision');
  if (mods.includes('file')) caps.push('file');
  if (mods.includes('audio')) caps.push('audio');
  if (mods.includes('video')) caps.push('video');
  if (sp.includes('tools')) caps.push('tools');
  if (sp.includes('structured_outputs') || sp.includes('response_format')) caps.push('json');
  if (sp.includes('reasoning') || sp.includes('include_reasoning')) caps.push('reasoning');
  return caps;
}

(async () => {
  const { MODELS } = parseDataJs(fs.readFileSync(DATA_JS, 'utf8'));
  console.log(`读取 data.js：${MODELS.length} 款模型\n`);

  const json = await fetchJson('openrouter.ai', '/api/v1/models');
  // 能力与价格无关：不过滤「无价格」条目（o3、Amazon Nova 系列、Cohere Command A
  // 等在本接口里价格为空/免费，但能力元数据是齐全的，不能因此丢掉）
  const list = (json.data || []).filter((m) => m.architecture && m.architecture.input_modalities);
  console.log(`OpenRouter 返回 ${(json.data || []).length} 条（含能力元数据 ${list.length} 条）\n`);

  // 预处理：剥掉 ~ 前缀与可能存在的 :batch 等变体后缀标注（保留原 id 用于报告）
  const pool = list.map((m) => {
    let id = String(m.id || '').replace(/^~/, '').trim();
    if (id.includes('/')) id = id.slice(id.lastIndexOf('/') + 1);
    return { id, entry: m };
  }).filter((x) => x.id);

  const results = [];
  for (const model of MODELS) {
    const hits = pool.filter((p) => matchModel(p.id, model.short, model.name));
    if (!hits.length) {
      results.push({ short: model.short, caps: null, reason: 'OpenRouter 无此模型' });
      continue;
    }
    // 同源择优：取原始词元最少者（最接近基础款），与 fetch-prices 的策略一致
    hits.sort((a, b) => coreTokens(a.id).length - coreTokens(b.id).length || a.id.length - b.id.length);
    const best = hits[0];
    results.push({
      short: model.short,
      caps: deriveCaps(best.entry),
      matchedId: best.id,
      contextLength: best.entry.context_length,
      ambiguous: hits.length > 1 ? hits.map((h) => h.id) : null,
    });
  }

  /* ---------- 人工核实名单覆盖（人工优先，来源是官方文档，比聚合元数据更可信） ---------- */
  const MANUAL = JSON.parse(fs.readFileSync(MANUAL_JSON, 'utf8')).models || [];
  const STALE_DAYS = 90;
  const today = new Date();
  const manualApplied = [];
  const manualUnknownModel = [];
  const manualNowCovered = [];   // OpenRouter 已能自动获取 → 可从名单移除
  const manualStale = [];
  const byShort = new Map(results.map((r) => [r.short, r]));
  const modelShorts = new Set(MODELS.map((m) => m.short));

  for (const entry of MANUAL) {
    if (!modelShorts.has(entry.short)) { manualUnknownModel.push(entry.short); continue; }
    const bad = (entry.caps || []).filter((c) => !CAP_KEYS.includes(c));
    if (bad.length) throw new Error(`人工名单 [${entry.short}] 含非法能力值：${bad.join(', ')}`);

    const r = byShort.get(entry.short);
    if (r.caps) manualNowCovered.push(entry.short);
    if (r) {
      r.caps = entry.caps.slice();
      r.manual = true;
      r.source = entry.source;
      r.checked = entry.checked;
    }
    manualApplied.push(entry.short);

    const days = Math.floor((today - new Date(entry.checked + 'T00:00:00Z')) / 86400000);
    if (days > STALE_DAYS) manualStale.push(`${entry.short}（已 ${days} 天未核验，上限 ${STALE_DAYS} 天）`);
  }

  // ---------- 报告 ----------
  const covered = results.filter((r) => r.caps);
  const uncovered = results.filter((r) => !r.caps);
  console.log('=== 覆盖率 ===');
  console.log(`  可获取能力数据：${covered.length} / ${MODELS.length} 款`);
  console.log(`  无法获取      ：${uncovered.length} 款\n`);

  console.log('=== 各能力支持数量 ===');
  for (const k of CAP_KEYS) {
    const n = covered.filter((r) => r.caps.includes(k)).length;
    console.log(`  ${k.padEnd(10)} ${String(n).padStart(3)} / ${covered.length}`);
  }

  console.log('\n=== 歧义命中（同源多 id，已按最短 id 择优，建议人工扫一眼）===');
  const amb = results.filter((r) => r.ambiguous);
  if (!amb.length) console.log('  （无）');
  for (const a of amb) console.log(`  ${a.short} ← 采用 ${a.matchedId} ；候选 ${a.ambiguous.join(', ')}`);

  console.log('\n=== 无能力数据（OpenRouter 未收录，页面将显示「未知」）===');
  if (!uncovered.length) console.log('  （无）');
  for (const u of uncovered) console.log(`  ${u.short}  （${u.reason}）`);

  console.log('\n=== 人工核实名单（caps-manual.json）===');
  console.log(`  已应用 ${manualApplied.length} 款：${manualApplied.join('、') || '（无）'}`);
  if (manualNowCovered.length) {
    console.log(`  ℹ 以下模型 OpenRouter 已能自动获取，可考虑从人工名单移除（会自动改用聚合数据）：`);
    for (const s of manualNowCovered) console.log(`     - ${s}`);
  }
  if (manualStale.length) {
    console.log(`  ⚠ 以下条目超过 ${STALE_DAYS} 天未核验，请对照官方文档复查：`);
    for (const s of manualStale) console.log(`     - ${s}`);
  }
  if (manualUnknownModel.length) {
    console.log(`  ⚠ 以下 short 在 data.js 中不存在（拼写错误或模型已删除），请修正 caps-manual.json：`);
    for (const s of manualUnknownModel) console.log(`     - ${s}`);
  }

  console.log('\n=== 明细（前 20 款）===');
  for (const r of covered.slice(0, 20)) {
    const tag = r.manual ? '  ← 人工核实官方文档' : '';
    console.log(`  ${r.short.padEnd(22)} ${(r.caps.join(',') || '(无)').padEnd(42)} ctx=${r.contextLength}${tag}`);
  }

  if (!APPLY) {
    console.log('\n（本次为 dry-run，未写盘。确认无误后加 --apply 写入 data.js）');
    return;
  }

  // ---------- 写盘 ----------
  let text = fs.readFileSync(DATA_JS, 'utf8');
  const missed = [];
  let patched = 0;

  for (const r of results) {
    if (!r.caps) { missed.push(`${r.short}（无数据）`); continue; }
    const capsLit = `["${r.caps.join('","')}"]`;
    const before = text;
    text = insertOrReplaceCaps(text, r.short, capsLit);
    if (text === before) missed.push(`${r.short}（未定位到 tags 行）`);
    else patched++;
  }

  // 头部说明补一行
  if (!/接口能力 caps 字段/.test(text)) {
    text = text.replace(
      /(\n)(\s*\*\s*更新时间：)/,
      '$1 * 接口能力 caps 字段：来自 OpenRouter 元数据（input_modalities / supported_parameters），机器可验证，非人工推断；'
      + 'OpenRouter 未收录者由 scripts/caps-manual.json 按官方文档人工维护$1$2',
    );
  }

  fs.writeFileSync(DATA_JS, text, 'utf8');
  fs.writeFileSync(DEPLOY_DATA_JS, text, 'utf8');
  console.log(`\n已写入 ${patched} 款模型的 caps 字段（data.js + deploy/data.js 同步）`);
  if (missed.length) {
    console.log(`未处理 ${missed.length} 项：`);
    for (const m of missed) console.log('  - ' + m);
  }
  console.log('\n提示：请务必执行 node --check data.js 与 node scripts/verify-data.js 复核');

  // 人工名单里出现 data.js 不存在的 short 属于配置错误，让 CI 能看见（workflow 该步骤为 continue-on-error）
  if (manualUnknownModel.length) {
    console.error(`\n⚠ caps-manual.json 中有 ${manualUnknownModel.length} 个 short 在 data.js 中不存在，请修正。`);
    process.exitCode = 1;
  }
})().catch((e) => {
  console.error('失败：' + e.message);
  process.exit(1);
});

/** 在指定模型的块内，找到 tags: [...] 行并在其后插入/替换 caps: [...] */
function insertOrReplaceCaps(text, short, capsLit) {
  const anchor = `short: "${short}"`;
  const at = text.indexOf(anchor);
  if (at < 0) return text;

  // ⚠️ 窗口必须严格限制在「本模型对象」内。
  // 曾经的 bug：窗口取固定 2500 字符，而单个模型块仅约 600 字符，于是窗口跨到了后面
  // 几个模型，导致「已有 caps」命中的是邻居模型的 caps 行——既写不进目标模型，
  // 又把邻居的 caps 覆盖成错误值。模型对象以 \n}, 收尾，据此定界。
  const closeIdx = text.indexOf('\n},', at);
  const end = closeIdx > 0 ? closeIdx : Math.min(text.length, at + 1200);
  const win = text.slice(at, end);

  // 已有 caps: 则替换（仅在窗口内查找）
  const existing = win.match(/\n(\s*)caps:\s*\[[^\]]*\]/);
  if (existing) {
    const start = at + existing.index;
    const stop = start + existing[0].length;
    return text.slice(0, start) + `\n${existing[1]}caps: ${capsLit}` + text.slice(stop);
  }

  // 没有则在 tags 行之后插入，缩进沿用 tags 行
  const tagsLine = win.match(/\n(\s*)tags:\s*\[[^\]]*\],?/);
  if (!tagsLine) return text;
  const indent = tagsLine[1];
  const insertAt = at + tagsLine.index + tagsLine[0].length;
  return text.slice(0, insertAt) + `\n${indent}caps: ${capsLit},` + text.slice(insertAt);
}

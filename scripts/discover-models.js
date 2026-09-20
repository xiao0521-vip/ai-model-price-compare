#!/usr/bin/env node
/* ============================================================
 * discover-models.js —— 新模型巡检：把 OpenRouter 上「总表还没有」的
 *                      主流模型找出来，可自动收录进 data.js
 *
 * 用法：
 *   node scripts/discover-models.js --dry-run   只报告候选（CI 每日跑这个）
 *   node scripts/discover-models.js --apply     收录候选中「高置信度」的模型
 *
 * 收录门槛（四条同时满足，宁缺毋滥）：
 *   1. 厂商在白名单内（主流厂，屏蔽小众/实验项目）
 *   2. 有有效价格（prompt/completion 均 > 0）
 *   3. 上下文 ≥ MIN_CTX（默认 32K）
 *   4. 非变体/非专用模型：排除 :batch / :free / :floor / -exp / -distill /
 *      contributor / 仅图像或音频输出 等
 *
 * 自动收录的条目会带 autoAdded: true 与「待人工校订」的 priceSrc/desc，
 * 方便后续人工补正（venderZh / type / family / desc 由脚本按规则推导）。
 * ============================================================ */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { parseDataJs, matchModel, coreTokens } = require('./lib');

const ROOT = path.resolve(__dirname, '..');
const DATA_JS = path.join(ROOT, 'data.js');
const DEPLOY_DATA_JS = path.join(ROOT, 'deploy', 'data.js');

const APPLY = process.argv.includes('--apply');
const MIN_CTX = 32000;
const FX = 7.1;

/** 主流厂商白名单：OpenRouter 的 vendor 前缀 → 站内字段 */
const VENDORS = {
  'openai': { vendor: 'OpenAI', vendorZh: 'OpenAI', tag: 'OpenAI官方' },
  'anthropic': { vendor: 'Anthropic', vendorZh: 'Anthropic', tag: 'Anthropic官方' },
  'google': { vendor: 'Google', vendorZh: '谷歌', tag: 'Google官方' },
  'deepseek': { vendor: 'DeepSeek', vendorZh: '深度求索', tag: '官方' },
  'qwen': { vendor: 'Alibaba', vendorZh: '阿里通义', tag: '阿里云百炼' },
  'z-ai': { vendor: 'Zhipu', vendorZh: '智谱', tag: '智谱官方' },
  'moonshotai': { vendor: 'Moonshot', vendorZh: '月之暗面', tag: '月之暗面官方' },
  'minimax': { vendor: 'MiniMax', vendorZh: 'MiniMax', tag: 'MiniMax官方' },
  'x-ai': { vendor: 'xAI', vendorZh: 'xAI', tag: 'xAI官方' },
  'meta-llama': { vendor: 'Meta', vendorZh: 'Meta', tag: 'OpenRouter' },
  'mistralai': { vendor: 'Mistral', vendorZh: 'Mistral', tag: 'Mistral官方' },
  'cohere': { vendor: 'Cohere', vendorZh: 'Cohere', tag: 'Cohere官方' },
  'amazon': { vendor: 'Amazon', vendorZh: '亚马逊', tag: 'AWS Bedrock' },
  'tencent': { vendor: 'Tencent', vendorZh: '腾讯', tag: '腾讯云' },
  'baidu': { vendor: 'Baidu', vendorZh: '百度', tag: '百度千帆' },
  'bytedance-seed': { vendor: 'ByteDance', vendorZh: '字节跳动', tag: '火山方舟' },
  'stepfun-ai': { vendor: 'StepFun', vendorZh: '阶跃星辰', tag: '阶跃星辰官方' },
  '01-ai': { vendor: '01.AI', vendorZh: '零一万物', tag: '零一万物官方' },
};

/** 变体/专用模型：一律不收录
 *  - :batch/:free/:floor/:exacto  → 计费变体
 *  - -exp/-distill/contributor    → 实验版
 *  - -latest/-preview-            → 别名（指向已有模型）
 *  - -high/-low/-medium 结尾      → 同一模型的不同推理强度档
 *  - -image / 图像音频输出        → 生成类模型（本站比的是文本 token 价）
 *  - search-preview/embed/rerank/tts/guard → 专用模型
 */
const EXCLUDE_RE = /(:batch|:free|:floor|:exacto|:thinking|-exp\b|-exp-|-distill|contributor|-latest\b|-preview-|search-preview|embed|rerank|whisper|tts|guard|-(high|low|medium)$|-image\b)/i;

/** 快照/日期版 id：如 gpt-4o-mini-2024-07-18、claude-3-5-haiku-20241022
 *  这类不是新模型，只是同一模型的固定版本快照 → 比对时剥掉日期再匹配 */
function stripDateSuffix(id) {
  return id.replace(/-\d{4}-\d{2}-\d{2}$/, '').replace(/-\d{8}$/, '').replace(/-\d{6}$/, '');
}

/** 提取版本号数字序列：gpt-5.6 → [5,6]，qwen3.7-flash → [3,7]，glm-4.5 → [4,5] */
function versionOf(id) {
  const m = id.match(/(\d+(?:\.\d+)?)/);
  if (!m) return [];
  return m[1].split('.').map(Number);
}

/** a 的版本是否高于 b */
function versionGreater(a, b) {
  const A = versionOf(a), B = versionOf(b);
  if (!A.length) return false;
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const x = A[i] || 0, y = B[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

function fetchJson(host, p) {
  return new Promise((res, rej) => {
    const req = https.get({ host, path: p, timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } }, (r) => {
      const c = []; r.on('data', (d) => c.push(d));
      r.on('end', () => { try { res(JSON.parse(Buffer.concat(c).toString('utf8'))); } catch (e) { rej(e); } });
    });
    req.on('error', rej);
    req.on('timeout', () => { req.destroy(); rej(new Error('timeout')); });
  });
}

const TODAY = new Date().toISOString().slice(0, 10);

/** 上下文窗口格式化：1000000 → 1.0M，262144 → 262K */
function fmtCtx(n) {
  if (!n) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'K';
  return String(n);
}

/** 由 caps 推导站内语义标签 */
function deriveTags(caps, ctx) {
  const tags = ['text'];
  if (caps.includes('vision') || caps.includes('video')) tags.push('multimodal');
  if (ctx >= 200000) tags.push('longctx');
  if (caps.includes('reasoning')) tags.push('reasoning');
  if (caps.includes('tools')) tags.push('agent');
  return tags;
}

function deriveCaps(entry) {
  const mods = (entry.architecture || {}).input_modalities || [];
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

/** 去掉版本尾巴，作为家族名：gpt-6-astra-pro → gpt-6-astra */
function familyOf(id) {
  return id.replace(/-(pro|mini|nano|lite|flash|turbo|max|high|small|large|medium|plus|air|code|preview|latest|thinking|vl|vision).*$/i, '');
}

(async () => {
  const { MODELS } = parseDataJs(fs.readFileSync(DATA_JS, 'utf8'));
  console.log(`读取 data.js：${MODELS.length} 款模型\n`);

  const json = await fetchJson('openrouter.ai', '/api/v1/models');
  const all = json.data || [];

  const candidates = [];
  const excluded = { variant: 0, noPrice: 0, smallCtx: 0, vendor: 0, nonText: 0 };

  for (const m of all) {
    const full = String(m.id || '').replace(/^~/, '').trim();
    const slash = full.indexOf('/');
    if (slash < 0) continue;
    const vendorKey = full.slice(0, slash);
    let id = full.slice(slash + 1);

    if (!VENDORS[vendorKey]) { excluded.vendor++; continue; }
    if (EXCLUDE_RE.test(full)) { excluded.variant++; continue; }

    // 只收文本输出的模型（本站对比的是文本 token 价格；图像/音频生成类排除）
    const outMods = (m.architecture || {}).output_modalities || [];
    if (outMods.some((x) => x !== 'text')) { excluded.nonText++; continue; }

    const pin = parseFloat((m.pricing || {}).prompt);
    const pout = parseFloat((m.pricing || {}).completion);
    if (!(pin > 0) || !(pout > 0)) { excluded.noPrice++; continue; }
    if ((m.context_length || 0) < MIN_CTX) { excluded.smallCtx++; continue; }

    // 已在总表？（剥掉日期快照后缀再匹配，避免「同一模型的固定快照」被当成新模型）
    const idForMatch = stripDateSuffix(id);
    if (MODELS.some((x) => matchModel(idForMatch, x.short, x.name))) continue;

    const caps = deriveCaps(m);
    const idSafe = stripDateSuffix(id);   // 版本比较与命名都用去掉日期快照的 id
    candidates.push({
      full,
      vendor: VENDORS[vendorKey].vendor,
      vendorZh: VENDORS[vendorKey].vendorZh,
      vendorTag: VENDORS[vendorKey].tag,
      id,
      idSafe,
      short: idSafe.replace(/-/g, ' ').replace(/\b([a-z])/g, (s) => s.toUpperCase()).replace(/\s+/g, ' ').trim(),
      family: familyOf(idSafe),
      ctx: m.context_length,
      inputPm: Number((pin * FX * 1e6).toFixed(4)),
      outputPm: Number((pout * FX * 1e6).toFixed(4)),
      caps,
      name: m.name || id,
    });
  }

  // 同家族判定 + 版本是否更高（只有「版本号确实更高」才值得自动收录）
  // 家族键取字母部分（GPT-5.6 与 gpt-5.4 同属 gpt 家族），再用版本号大小判定新旧，
  // 这样「已收录 5.6 时又出现 5.4」不会被误判为新模型，只有真正的代际升级（如 6.x）才会命中。
  const familyKey = (x) => String(x || '').toLowerCase().replace(/[^a-z]/g, '');
  const familyMax = new Map();
  for (const m of MODELS) {
    const key = familyKey(m.family || m.name);
    if (!key) continue;
    const cur = familyMax.get(key);
    if (!cur || versionGreater(m.name || m.short, cur.name)) {
      familyMax.set(key, { name: m.name || m.short, short: m.short });
    }
  }
  for (const c of candidates) {
    const key = familyKey(c.family);
    const cur = familyMax.get(key);
    c.sameFamily = !!cur;
    // 只有「双方都有版本号」时才比较大小：避免拿 nova-2 与无数值的 Nova Premier 硬比
    c.versionBump = !!cur && versionOf(c.idSafe).length > 0 && versionOf(cur.name).length > 0
      && versionGreater(c.idSafe, cur.name);
    c.familyTop = cur ? cur.short : null;
  }
  candidates.sort((a, b) => (b.versionBump - a.versionBump) || (b.sameFamily - a.sameFamily) || (a.inputPm - b.inputPm));

  const bumps = candidates.filter((c) => c.versionBump);
  const sameFam = candidates.filter((c) => c.sameFamily && !c.versionBump);
  const brandNew = candidates.filter((c) => !c.sameFamily);

  console.log('=== 候选新模型（OpenRouter 有、总表没有）===');
  console.log(`  共 ${candidates.length} 个候选：版本更新 ${bumps.length} ｜ 同家族其他档位 ${sameFam.length} ｜ 全新家族 ${brandNew.length}\n`);

  console.log('--- ① 版本更新（同家族、版本号更高 → 可自动收录）---');
  if (!bumps.length) console.log('  （无）');
  for (const c of bumps.slice(0, 25)) {
    console.log(`  ★ ${c.full.padEnd(40)} ¥${String(c.inputPm).padStart(9)}/¥${String(c.outputPm).padStart(9)}  ctx=${fmtCtx(c.ctx).padStart(6)}  取代/并列 ${c.familyTop}`);
  }

  console.log('\n--- ② 同家族的其他档位（需人工判断是否值得单列）---');
  if (!sameFam.length) console.log('  （无）');
  for (const c of sameFam.slice(0, 20)) {
    console.log(`    ${c.full.padEnd(40)} ¥${String(c.inputPm).padStart(9)}/¥${String(c.outputPm).padStart(9)}  ctx=${fmtCtx(c.ctx).padStart(6)}`);
  }
  if (sameFam.length > 20) console.log(`    ... 其余 ${sameFam.length - 20} 个`);

  console.log('\n--- ③ 全新家族（可能是新厂商/新系列，人工评估）---');
  if (!brandNew.length) console.log('  （无）');
  for (const c of brandNew.slice(0, 15)) {
    console.log(`    ${c.full.padEnd(40)} ¥${String(c.inputPm).padStart(9)}/¥${String(c.outputPm).padStart(9)}  ctx=${fmtCtx(c.ctx).padStart(6)}`);
  }
  if (brandNew.length > 15) console.log(`    ... 其余 ${brandNew.length - 15} 个`);

  console.log('\n=== 被过滤掉的数量统计 ===');
  console.log(`  非白名单厂商 ${excluded.vendor} | 变体/专用 ${excluded.variant} | 无价格 ${excluded.noPrice} | 上下文过小 ${excluded.smallCtx} | 非文本输出 ${excluded.nonText}`);
  console.log('\n（★ = 与总表已有模型同家族，通常是新版本，优先级最高）');

  if (!APPLY) {
    console.log('\n（本次为 dry-run，未写盘。确认后加 --apply 收录高置信度候选）');
    return;
  }

  // ---------- 收录：只收「版本号确实更高」的候选 ----------
  const toAdd = bumps;
  if (!toAdd.length) {
    console.log('\n没有可自动收录的候选（仅收录「同家族且版本号更高」的模型）。');
    return;
  }

  let text = fs.readFileSync(DATA_JS, 'utf8');
  const blocks = toAdd.map((c) => {
    const tags = deriveTags(c.caps, c.ctx);
    return [
      '{',
      `  name: "${c.name}", short: "${c.short}", family: "${c.family}",`,
      `  vendor: "${c.vendor}", vendorZh: "${c.vendorZh}", type: "通用均衡", billing: "per_token",`,
      `  inputPm: ${c.inputPm}, outputPm: ${c.outputPm}, cnyOnly: false, context: "${fmtCtx(c.ctx)}",`,
      `  tags: [${tags.map((t) => `"${t}"`).join(',')}],`,
      `  caps: [${c.caps.map((x) => `"${x}"`).join(',')}],`,
      `  vendorTag: "${c.vendorTag}",`,
      `  priceSrc: "OpenRouter 聚合价（${TODAY} 自动收录，待人工校订为新模型条目）",`,
      `  updated: "${TODAY}",`,
      `  autoAdded: true,`,
      `  desc: "【自动收录·待校订】${c.vendorZh} 于 OpenRouter 上架的新模型（id: ${c.full}），${fmtCtx(c.ctx)} 上下文，¥${c.inputPm}/¥${c.outputPm} 每百万 token。官方定位说明与类型归类待人工补充。",`,
      '},',
    ].join('\n');
  }).join('\n');

  // 插入到 MODELS 数组末尾（最后一个 '];' 之前）
  const modStart = text.indexOf('var MODELS');
  const modEnd = text.indexOf('\n];', modStart);
  if (modStart < 0 || modEnd < 0) throw new Error('未找到 MODELS 数组边界');
  text = text.slice(0, modEnd) + '\n' + blocks + text.slice(modEnd);

  fs.writeFileSync(DATA_JS, text, 'utf8');
  fs.writeFileSync(DEPLOY_DATA_JS, text, 'utf8');
  console.log(`\n已收录 ${toAdd.length} 款新模型（data.js + deploy/data.js 同步）：`);
  for (const c of toAdd) console.log(`  + ${c.short}（${c.full}）`);
  console.log('\n⚠️ 这些条目带 autoAdded: true，priceSrc 与 desc 标注「待人工校订」——请人工核对后补正类型/家族/官方定位。');
  console.log('提示：请执行 node --check data.js 与 node scripts/verify-data.js 复核');
})().catch((e) => { console.error('失败：' + e.message); process.exit(1); });

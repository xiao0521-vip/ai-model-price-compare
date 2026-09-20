#!/usr/bin/env node
/* ============================================================
 * sync-lifecycle.js —— 同步模型「生命周期」信息到 data.js
 *
 * 写入字段：
 *   retireDate  下架/停服日期（YYYY-MM-DD）
 *   retireSrc   该日期的来源（官方公告链接 或 "OpenRouter"）
 *
 * 两级来源（人工优先）：
 *   1) OpenRouter 元数据 expiration_date —— 表示「聚合平台下架时间」，自动同步
 *      ⚠️ 该字段有哨兵值（如 2098-12-31 表示不设期限），超过 FAR_FUTURE 的忽略
 *   2) scripts/lifecycle-manual.json —— 厂商官方停服/弃用日期，来源须为官方文档
 *
 * 报告：
 *   - 已停服（retireDate 已过）→ 提示评估从总表移除
 *   - 即将下架（60 天内）→ 站点显示角标，CI 提醒用户
 *
 * 用法：
 *   node scripts/sync-lifecycle.js --dry-run
 *   node scripts/sync-lifecycle.js --apply
 * ============================================================ */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { parseDataJs, matchModel, coreTokens } = require('./lib');

const ROOT = path.resolve(__dirname, '..');
const DATA_JS = path.join(ROOT, 'data.js');
const DEPLOY_DATA_JS = path.join(ROOT, 'deploy', 'data.js');
const MANUAL_JSON = path.join(__dirname, 'lifecycle-manual.json');

const APPLY = process.argv.includes('--apply');
const FAR_FUTURE = '2035-01-01';   // 超过此日期的 expiration_date 视为哨兵（不限期），忽略
const SOON_DAYS = 60;

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
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);

(async () => {
  const { MODELS } = parseDataJs(fs.readFileSync(DATA_JS, 'utf8'));
  console.log(`读取 data.js：${MODELS.length} 款模型　今天 ${TODAY}\n`);

  const json = await fetchJson('openrouter.ai', '/api/v1/models');
  const pool = (json.data || [])
    .filter((m) => m.architecture && m.architecture.input_modalities)
    .map((m) => {
      let id = String(m.id || '').replace(/^~/, '').trim();
      if (id.includes('/')) id = id.slice(id.lastIndexOf('/') + 1);
      return { id, entry: m };
    }).filter((x) => x.id);

  const results = [];
  for (const model of MODELS) {
    const hits = pool.filter((p) => matchModel(p.id, model.short, model.name));
    let date = null, src = null, fromOR = null;
    if (hits.length) {
      hits.sort((a, b) => coreTokens(a.id).length - coreTokens(b.id).length || a.id.length - b.id.length);
      const exp = hits[0].entry.expiration_date;
      if (exp && exp < FAR_FUTURE) { date = exp; src = 'OpenRouter'; fromOR = hits[0].id; }
    }
    results.push({ short: model.short, date, src, fromOR, manual: false });
  }

  // ---------- 人工名单（官方公告优先） ----------
  const manual = JSON.parse(fs.readFileSync(MANUAL_JSON, 'utf8')).models || [];
  const modelShorts = new Set(MODELS.map((m) => m.short));
  const byShort = new Map(results.map((r) => [r.short, r]));
  const unknownManual = [];
  const overridden = [];
  const removedManual = [];   // 本次被移除、且来自人工名单的条目 → 自动归档

  for (const e of manual) {
    if (!modelShorts.has(e.short)) { unknownManual.push(e.short); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.retireDate || '')) throw new Error(`人工名单 [${e.short}] retireDate 格式错误`);
    if (!/^https?:\/\//.test(e.retireSrc || '')) throw new Error(`人工名单 [${e.short}] 缺少官方依据链接`);
    const r = byShort.get(e.short);
    if (r.date && r.date !== e.retireDate) overridden.push(`${e.short}：OpenRouter ${r.date} → 官方 ${e.retireDate}`);
    r.date = e.retireDate;
    r.src = e.retireSrc;
    r.manual = true;
    r.note = e.note;
  }

  // ---------- 报告 ----------
  const dated = results.filter((r) => r.date);
  const retired = dated.filter((r) => r.date < TODAY).sort((a, b) => a.date.localeCompare(b.date));
  const soon = dated.filter((r) => r.date >= TODAY && daysBetween(TODAY, r.date) <= SOON_DAYS)
    .sort((a, b) => a.date.localeCompare(b.date));

  console.log('=== 生命周期总览 ===');
  console.log(`  已知下架日期的模型：${dated.length} / ${MODELS.length} 款（其余为未公布/长期在售）`);
  console.log(`  🪦 已停服：${retired.length} 款　⏳ ${SOON_DAYS} 天内即将下架：${soon.length} 款\n`);

  if (retired.length) {
    console.log(`=== 🪦 已停服（--apply 时会自动从总表移除）===`);
    for (const r of retired) console.log(`  ${r.date}  ${r.short}　来源：${r.manual ? '官方' : 'OpenRouter'}${r.note ? '　' + r.note : ''}`);
    console.log('');
  }
  if (soon.length) {
    console.log(`=== ⏳ ${SOON_DAYS} 天内即将下架 ===`);
    for (const r of soon) console.log(`  ${r.date}（还剩 ${daysBetween(TODAY, r.date)} 天）  ${r.short}　来源：${r.manual ? '官方' : 'OpenRouter'}`);
    console.log('');
  }
  const later = dated.filter((r) => daysBetween(TODAY, r.date) > SOON_DAYS).sort((a, b) => a.date.localeCompare(b.date));
  if (later.length) {
    console.log('=== 📅 更远期下架（仅登记，页面暂不提示）===');
    for (const r of later.slice(0, 15)) console.log(`  ${r.date}  ${r.short}`);
    if (later.length > 15) console.log(`  ... 其余 ${later.length - 15} 款`);
    console.log('');
  }
  if (overridden.length) {
    console.log('=== ⚠ 人工名单覆盖了 OpenRouter 日期（口径不同，已在上面采用官方值）===');
    for (const o of overridden) console.log('  ' + o);
    console.log('');
  }
  if (unknownManual.length) {
    console.log('=== ⚠ 人工名单中 short 不存在于 data.js ===');
    for (const u of unknownManual) console.log('  ' + u);
    console.log('');
  }

  if (!APPLY) {
    console.log('（本次为 dry-run，未写盘。确认无误后加 --apply 写入 data.js）');
    return;
  }

  // ---------- 写盘 ----------
  let text = fs.readFileSync(DATA_JS, 'utf8');
  let patched = 0;
  const missed = [];

  // 1) 先移除「已明确下架」的模型（retireDate 已过 且 有明确依据 retireSrc）
  //    安全设计：必须同时满足两个条件才移除——日期已过 + 有来源，避免误删；
  //    历史记录在 git 里可随时找回，站点侧另有「已停服」角标兜底。
  const removed = [];
  for (const r of results) {
    if (!r.date || !r.src) continue;
    if (r.date >= TODAY) continue;
    const before = text;
    text = removeModel(text, r.short);
    if (text !== before) {
      removed.push(`${r.short}（下架日 ${r.date}，依据 ${r.manual ? '官方公告' : 'OpenRouter'}）`);
      if (r.manual) removedManual.push({ short: r.short, date: r.date, src: r.src, note: r.note });
    }
  }
  if (removed.length) {
    console.log(`\n=== 🗑 已移除下架模型 ${removed.length} 款 ===`);
    for (const x of removed) console.log('  - ' + x);
  }

  // 2) 其余模型写入/更新生命周期字段
  let unchanged = 0;
  for (const r of results) {
    if (!r.date) continue;
    if (r.date < TODAY && r.src) continue;   // 已被移除，不再写字段
    const before = text;
    text = upsertField(text, r.short, 'retireDate', `"${r.date}"`);
    text = upsertField(text, r.short, 'retireSrc', `"${r.src}"`);
    if (text === before) {
      // 值本来就一致（幂等），不算失败；只有字段确实缺失才算「未定位」
      const hasField = new RegExp(`retireDate:\\s*"${r.date}"`).test(text);
      if (hasField) unchanged++; else missed.push(r.short);
    } else patched++;
  }

  // 3) 头部计数、头部日期与 META.updated 同步
  //    ⚠️ 计数不能用 /^\s*short:/ —— data.js 里 name 与 short 写在同一行
  const remainCount = (text.match(/short:\s*"/g) || []).length;
  text = text.replace(/(收录 )(\d+)( 款模型)/, `$1${remainCount}$3`);
  text = text.replace(/\n( \* 更新时间：)\d{4}-\d{2}-\d{2}/, `\n$1${TODAY}`);
  if (!/retireDate/.test(text.split('\n').slice(0, 30).join('\n'))) {
    text = text.replace(
      /(\n)(\s*\*\s*更新时间：)/,
      '$1 * 生命周期：retireDate = 下架/停服日期，retireSrc = 该日期来源；日期已过且有依据的模型由 sync-lifecycle.js 自动移除$1$2',
    );
  }
  // META.updated 只在 META 对象内部替换，避免误改模型条目的 updated 字段
  const metaIdx = text.indexOf('var META');
  if (metaIdx >= 0) {
    const segEnd = metaIdx + 600;
    const seg = text.slice(metaIdx, segEnd)
      .replace(/(\n\s*updated: ")\d{4}-\d{2}-\d{2}(",)/, `$1${TODAY}$2`);
    text = text.slice(0, metaIdx) + seg + text.slice(segEnd);
  }

  fs.writeFileSync(DATA_JS, text, 'utf8');
  fs.writeFileSync(DEPLOY_DATA_JS, text, 'utf8');

  // 4) 自动归档：把已移除模型的人工记录从 models 挪到 archived（保留官方依据，便于追溯）
  if (removedManual.length) {
    const doc = JSON.parse(fs.readFileSync(MANUAL_JSON, 'utf8'));
    doc.models = (doc.models || []).filter((e) => !removedManual.some((x) => x.short === e.short));
    doc.archived = doc.archived || [];
    for (const x of removedManual) {
      if (doc.archived.some((a) => a.short === x.short)) continue;
      doc.archived.push({
        short: x.short, retireDate: x.date, retireSrc: x.src,
        removedOn: TODAY, note: (x.note || '') + `（${TODAY} 自动移除，记录留档）`,
      });
    }
    fs.writeFileSync(MANUAL_JSON, JSON.stringify(doc, null, 2) + '\n', 'utf8');
    console.log(`已归档 ${removedManual.length} 条人工记录到 lifecycle-manual.json 的 archived`);
  }

  console.log(`\n已写入 ${patched} 款模型的生命周期字段（${unchanged} 款值已一致，幂等跳过；data.js + deploy/data.js 已同步）`);
  console.log(`当前收录 ${remainCount} 款模型`);
  if (missed.length) console.log(`未定位到：${missed.join('、')}`);
  console.log('提示：请执行 node --check data.js 与 node scripts/verify-data.js 复核');
})().catch((e) => { console.error('失败：' + e.message); process.exit(1); });

/* ============================================================
 * 移除指定模型的整个对象
 * ⚠️ 必须按对象边界定界（固定字符窗口曾命中邻居模型导致静默写错）；
 *    且必须兼容 CRLF —— 文件是 CRLF 时 "\n{" 之后的字符是 "\r"，直接搜 "\n{\n" 会找不到
 * ============================================================ */
function removeModel(text, short) {
  const anchor = `short: "${short}"`;
  const at = text.indexOf(anchor);
  if (at < 0) return text;

  const openIdx = text.lastIndexOf('\n{', at);      // 本模型对象的起始大括号（行首）
  const endLine = objectEndIndex(text, at);          // 本模型对象的结束 "}" （行首）
  if (openIdx < 0 || endLine < 0) return text;

  let start = openIdx;
  if (text[start - 1] === '\r') start--;             // 连 CRLF 的 \r 一起删
  let end = text.indexOf('}', endLine) + 1;          // 跳过结束大括号
  if (text[end] === ',') end++;                      // 跳过逗号
  if (text[end] === '\r') end++;
  if (text[end] === '\n') end++;
  return text.slice(0, start) + text.slice(end);
}

/** 找到 at 之后第一个「行首的 }」（即对象结束位置），兼容 LF 与 CRLF */
function objectEndIndex(text, at) {
  const re = /\r?\n\}/g;
  re.lastIndex = at;
  const m = re.exec(text);
  return m ? m.index + m[0].length - 1 : -1;         // 返回 '}' 本身的下标
}

/* ============================================================
 * 在指定模型对象内插入或替换字段
 * ⚠️ 窗口严格按对象边界（\n},）定界 —— 曾因固定字符窗口命中邻居模型导致静默写错
 * ============================================================ */
function upsertField(text, short, field, literal) {
  const anchor = `short: "${short}"`;
  const at = text.indexOf(anchor);
  if (at < 0) return text;
  const end = objectEndIndex(text, at);                 // 本模型对象的结束位置（CRLF 安全）
  const win = text.slice(at, end > 0 ? end : Math.min(text.length, at + 1200));

  const existing = win.match(new RegExp('\\n(\\s*)' + field + ':\\s*("[^"]*"|[^,\\n]+),?'));
  if (existing) {
    const start = at + existing.index;
    const stop = start + existing[0].length;
    const trailing = existing[0].trimEnd().endsWith(',') ? ',' : ',';
    return text.slice(0, start) + `\n${existing[1]}${field}: ${literal}${trailing}` + text.slice(stop);
  }

  // 插在 updated 字段之后（若没有则插在 tags 之后）
  const anchorField = win.match(/\n(\s*)updated:\s*"[^"]*",?/) || win.match(/\n(\s*)tags:\s*\[[^\]]*\],?/);
  if (!anchorField) return text;
  const indent = anchorField[1];
  const insertAt = at + anchorField.index + anchorField[0].length;
  return text.slice(0, insertAt) + `\n${indent}${field}: ${literal},` + text.slice(insertAt);
}

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
    console.log(`=== 🪦 已停服（应评估从总表移除）===`);
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
  for (const r of results) {
    if (!r.date) continue;
    const before = text;
    text = upsertField(text, r.short, 'retireDate', `"${r.date}"`);
    text = upsertField(text, r.short, 'retireSrc', `"${r.src}"`);
    if (text === before) missed.push(r.short); else patched++;
  }

  // 头部说明补一行
  if (!/retireDate/.test(text.split('\n').slice(0, 30).join('\n'))) {
    text = text.replace(
      /(\n)(\s*\*\s*更新时间：)/,
      '$1 * 生命周期：retireDate = 下架/停服日期，retireSrc = 该日期来源（官方公告链接 或 "OpenRouter" 聚合平台口径）$1$2',
    );
  }

  fs.writeFileSync(DATA_JS, text, 'utf8');
  fs.writeFileSync(DEPLOY_DATA_JS, text, 'utf8');
  console.log(`已写入 ${patched} 款模型的生命周期字段（data.js + deploy/data.js 同步）`);
  if (missed.length) console.log(`未定位到：${missed.join('、')}`);
  console.log('提示：请执行 node --check data.js 与 node scripts/verify-data.js 复核');
})().catch((e) => { console.error('失败：' + e.message); process.exit(1); });

/* ============================================================
 * 在指定模型对象内插入或替换字段
 * ⚠️ 窗口严格按对象边界（\n},）定界 —— 曾因固定字符窗口命中邻居模型导致静默写错
 * ============================================================ */
function upsertField(text, short, field, literal) {
  const anchor = `short: "${short}"`;
  const at = text.indexOf(anchor);
  if (at < 0) return text;
  const closeIdx = text.indexOf('\n},', at);
  const end = closeIdx > 0 ? closeIdx : Math.min(text.length, at + 1200);
  const win = text.slice(at, end);

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

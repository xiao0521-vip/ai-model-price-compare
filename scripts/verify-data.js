#!/usr/bin/env node
/**
 * data.js 数据体检（部署前守门）
 * ============================================================
 * 用途：GitHub Actions 自动改完 data.js 之后、commit 之前跑一遍，
 *       防止爬虫抓到脏数据（null / 0 / 解析错位）被直接推上线。
 *
 * 检查项：
 *   A. 语法与整体结构（MODELS / SUBSCRIPTIONS / META 能否解析）
 *   B. 每款模型的 16 个必需字段是否齐全、类型是否正确
 *   C. 价格是否为有限正数
 *   D. short 唯一性、updated 日期格式
 *   E. 订阅 / 套餐结构（plans 非空、内嵌 models 字段完整）
 *   F. 与 git HEAD 版本对比的价格异常波动检测
 *      - 单次波动 > 50%   → 警告
 *      - 单次波动 > 400%  → 判定为解析错误，直接失败
 *
 * 退出码：0 = 通过（可能有警告）；1 = 有错误，禁止提交
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseDataJs } = require('./lib');

const ROOT = path.resolve(__dirname, '..');
const DATA_JS = path.join(ROOT, 'data.js');

const REQUIRED_MODEL_FIELDS = [
  'name', 'short', 'family', 'vendor', 'vendorZh', 'type', 'billing',
  'inputPm', 'outputPm', 'cnyOnly', 'context', 'tags', 'vendorTag',
  'priceSrc', 'updated', 'desc',
];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const WARN_SWING = 0.5;   // 50%
const FAIL_SWING = 4.0;   // 400%

let errors = 0;
let warns = 0;
const fail = (m) => { console.log('  ❌ ' + m); errors++; };
const warn = (m) => { console.log('  ⚠ ' + m); warns++; };

/* ============================================================
 * 读取并解析
 * ============================================================ */
console.log('=== data.js 数据体检 ===');
console.log('');

let source, data;
try {
  source = fs.readFileSync(DATA_JS, 'utf-8');
  data = parseDataJs(source);
} catch (e) {
  console.log('❌ A. 解析失败：' + e.message);
  process.exit(1);
}

const { META, MODELS, SUBSCRIPTIONS } = data;

/* ---------- A. 整体结构 ---------- */
console.log('A. 整体结构');
if (!MODELS.length) fail('MODELS 为空');
else console.log(`  ✅ MODELS ${MODELS.length} 款`);
if (!SUBSCRIPTIONS.length) fail('SUBSCRIPTIONS 为空');
else console.log(`  ✅ SUBSCRIPTIONS ${SUBSCRIPTIONS.length} 组`);
if (!META.updated || !DATE_RE.test(META.updated)) fail('META.updated 缺失或格式错误：' + META.updated);
else console.log(`  ✅ META.updated ${META.updated}`);
if (typeof META.fx !== 'number' || META.fx <= 0) fail('META.fx 非法：' + META.fx);
else console.log(`  ✅ META.fx ${META.fx}`);

/* ---------- B/C/D. 模型逐条校验 ---------- */
console.log('');
console.log('B/C/D. 模型字段与价格');
const seenShort = new Map();
const typeDist = {};
let okModels = 0;

MODELS.forEach((m, i) => {
  const id = m && m.short ? m.short : `#${i}`;

  // 必需字段
  const missing = REQUIRED_MODEL_FIELDS.filter(f => m[f] === undefined || m[f] === null || m[f] === '');
  if (missing.length) {
    fail(`[${id}] 缺字段：${missing.join(', ')}`);
    return;
  }

  // 类型
  if (typeof m.inputPm !== 'number' || !isFinite(m.inputPm) || m.inputPm <= 0) {
    fail(`[${id}] inputPm 非正数：${m.inputPm}`);
    return;
  }
  if (typeof m.outputPm !== 'number' || !isFinite(m.outputPm) || m.outputPm <= 0) {
    fail(`[${id}] outputPm 非正数：${m.outputPm}`);
    return;
  }
  if (typeof m.cnyOnly !== 'boolean') fail(`[${id}] cnyOnly 非布尔：${m.cnyOnly}`);
  if (!Array.isArray(m.tags) || !m.tags.length) fail(`[${id}] tags 为空`);
  if (!DATE_RE.test(m.updated)) fail(`[${id}] updated 格式错误：${m.updated}`);
  if (typeof m.type !== 'string' || !m.type.trim()) fail(`[${id}] type 非法：${m.type}`);
  typeDist[m.type] = (typeDist[m.type] || 0) + 1;

  // short 唯一
  const key = String(m.short).trim();
  if (seenShort.has(key)) fail(`short 重复：「${key}」（第 ${seenShort.get(key) + 1} 与第 ${i + 1} 条）`);
  else seenShort.set(key, i);

  okModels++;
});
console.log(`  ✅ ${okModels}/${MODELS.length} 款模型字段完整且价格合法`);
console.log(`  ℹ type 分布：${Object.entries(typeDist).map(([k, v]) => `${k} ${v}`).join(' / ')}`);

/* ---------- E. 订阅 / 套餐 ---------- */
console.log('');
console.log('E. 订阅 / 套餐结构');
let okSubs = 0, okSubModels = 0, subModelGroups = 0;

SUBSCRIPTIONS.forEach((s, i) => {
  const id = s && s.name ? s.name : `#${i}`;
  if (!s.name) { fail(`[#${i}] 缺 name`); return; }
  if (!s.kind) fail(`[${id}] 缺 kind`);
  if (!Array.isArray(s.plans) || !s.plans.length) { fail(`[${id}] plans 为空`); return; }

  s.plans.forEach((p, j) => {
    if (!p || !p.tier) fail(`[${id}] plans[${j}] 缺 tier`);
    if (!p || !p.price) fail(`[${id}] plans[${j}] 缺 price`);
  });

  if (s.models !== undefined) {
    if (!Array.isArray(s.models) || !s.models.length) {
      fail(`[${id}] models 存在但为空`);
    } else {
      subModelGroups++;
      s.models.forEach((mm, k) => {
        const mmId = mm && mm.name ? mm.name : `#${k}`;
        const need = ['name', 'type', 'tags', 'context', 'perToken', 'src', 'desc'];
        const miss = need.filter(f => mm[f] === undefined || mm[f] === null || mm[f] === '');
        if (miss.length) { fail(`[${id} › ${mmId}] 缺字段：${miss.join(', ')}`); return; }
        if (!Array.isArray(mm.tags) || !mm.tags.length) { fail(`[${id} › ${mmId}] tags 为空`); return; }
        okSubModels++;
      });
    }
  }

  okSubs++;
});
console.log(`  ✅ ${okSubs}/${SUBSCRIPTIONS.length} 组订阅结构完整`);
console.log(`  ✅ ${subModelGroups} 组内嵌模型清单，共 ${okSubModels} 条条目字段完整`);

/* ---------- F. 与 git HEAD 对比的异常波动 ---------- */
console.log('');
console.log('F. 价格异常波动检测（对比 git HEAD）');

let headSource = null;
try {
  headSource = execFileSync('git', ['show', 'HEAD:data.js'], {
    cwd: ROOT, encoding: 'utf-8', maxBuffer: 40 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
  });
} catch (e) {
  console.log('  ⏭ 跳过（当前目录不是 git 仓库或没有 HEAD 版本）');
}

if (headSource) {
  let head = null;
  try {
    head = parseDataJs(headSource);
  } catch (e) {
    warn('HEAD 版本 data.js 解析失败，跳过对比：' + e.message);
  }

  if (head && head.MODELS && head.MODELS.length) {
    const headMap = new Map(head.MODELS.map(m => [String(m.short).trim(), m]));
    let compared = 0, swingWarn = 0, swingFail = 0;

    for (const m of MODELS) {
      const old = headMap.get(String(m.short).trim());
      if (!old) continue;
      for (const f of ['inputPm', 'outputPm']) {
        const o = old[f], n = m[f];
        if (typeof o !== 'number' || !isFinite(o) || o <= 0) continue;
        compared++;
        const ratio = Math.abs(n - o) / o;
        if (ratio > FAIL_SWING) {
          fail(`[${m.short}] ${f} 异常：¥${o} → ¥${n}（${(ratio * 100).toFixed(0)}%），疑似抓取解析错误`);
          swingFail++;
        } else if (ratio > WARN_SWING) {
          warn(`[${m.short}] ${f} 波动较大：¥${o} → ¥${n}（${(ratio * 100).toFixed(0)}%），请人工确认`);
          swingWarn++;
        }
      }
    }
    console.log(`  ℹ 对比了 ${compared} 个价格字段，${swingWarn} 处大波动警告，${swingFail} 处异常错误`);
    if (!swingWarn && !swingFail) console.log('  ✅ 无异常波动');
  }
}

/* ---------- 汇总 ---------- */
console.log('');
console.log('=== 体检结果 ===');
console.log(`  错误 ${errors} 项，警告 ${warns} 项`);

if (errors) {
  console.log('');
  console.log('❌ 体检未通过 —— 已阻止本次数据提交。');
  process.exit(1);
}
console.log('✅ 体检通过。');

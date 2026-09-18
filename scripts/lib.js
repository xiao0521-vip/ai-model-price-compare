/**
 * 通用工具函数库
 * ============================================================
 */

const AX = require('axios');
const fs = require('fs');

/* ============================================================
 * 价格合理性阈值（fetch-prices 与 verify-data 共用，避免两边走偏）
 *   单位统一为「人民币 / 每百万 token」
 * ============================================================ */
const SANITY = {
  pmMin: 0.01,      // 低于此值几乎必是解析错位
  pmMax: 20000,     // 高于此值几乎必是单位换算错误
  warnDelta: 0.5,   // 与上次相差超过 50% → 警告
  maxRatio: 4,      // 与上次相差超过 4 倍 → 判定为单位/解析错误，丢弃
};

/* ============================================================
 * 1. 从 HTML 中提取纯文本（去除标签）
 * ============================================================ */
function extractText(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ============================================================
 * 2. 从 HTML 中通用解析价格表格
 *    配置项：
 *      pattern   - 正则，捕获组 [1]=模型名 [2]=输入价 [3]=输出价
 *      quotePer  - 【关键】页面报价的计价单位是「每多少 token」。
 *                  页面写 "$1.20 / $6.76 per 1M tokens" → quotePer: 1e6
 *                  页面写 "$0.0012 / $0.0068 per 1K tokens" → quotePer: 1e3
 *                  统一换算为「元 / 每百万 token」输出。
 *      usdToCny  - USD→CNY 汇率（默认 7.1）；isCny=true 时忽略
 *      isCny     - 页面报价本身就是人民币（默认 false）
 *
 *    ⚠️ 历史坑：旧参数名叫 perUnit 且语义是「乘数」，导致把
 *       「每百万美元价」又乘 1e6，Gemini 2.5 Pro 一度被写成 ¥8,529,940。
 *       改成语义明确的 quotePer（除数）后不可能再犯。
 * ============================================================ */
function parseHtmlPrices(html, opts = {}) {
  const { pattern, usdToCny = 7.1, quotePer = 1e6, isCny = false } = opts;
  if (!html || !pattern) return {};

  // 报价 → 人民币/每百万 token 的换算系数
  const scale = (1e6 / quotePer) * (isCny ? 1 : usdToCny);

  const models = {};
  const re = new RegExp(pattern.source, 'g');
  let m;
  while ((m = re.exec(html)) !== null) {
    const name = m[1].trim();
    const input = parseFloat(m[2]);
    const output = parseFloat(m[3]);
    if (!name || !input || !output) continue;
    // 跳过标题行
    if (/模型|model|名称|name|input|output|输入|输出/i.test(name)) continue;
    models[name] = {
      input: (input * scale).toFixed(2),
      output: (output * scale).toFixed(2),
    };
  }
  return models;
}

/* ============================================================
 * 3. 带重试的 HTTP GET
 * ============================================================ */
async function fetchWithRetry(url, maxRetries = 3, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await AX.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PriceBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/json',
        },
        timeout: 30000,
        maxRedirects: 5,
      });
      return res.data;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      console.warn(`  ⚠ 第 ${i + 1} 次请求失败，${delay}ms 后重试...`);
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
}

/* ============================================================
 * 4. 读取 data.js 原文
 * ============================================================ */
function readDataJs(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

/* ============================================================
 * 5. 安全解析 data.js（用 vm 执行，取出 var 声明的全局量）
 * ============================================================ */
function parseDataJs(content) {
  const vm = require('vm');
  const sandbox = {};
  const context = vm.createContext(sandbox);
  vm.runInContext(content, context);
  return {
    META: sandbox.META || {},
    MODELS: sandbox.MODELS || [],
    SUBSCRIPTIONS: sandbox.SUBSCRIPTIONS || [],
  };
}

/* ============================================================
 * 6. 就地修补 data.js 中指定模型的字段
 *    —— 关键：绝不能用 JSON.stringify 整体重写 MODELS。
 *       那样会丢掉所有分区注释（/* === OpenAI === *\/）并把
 *       「一行一字段」的可读排版压成紧凑 JSON，人工没法再维护。
 *    做法：用 `short: "名称"` 做锚点，只在其后 900 字符的窗口内
 *          替换目标字段，其余内容原样保留。
 *    changes: [{ model, field:'inputPm'|'outputPm'|'updated', newVal }]
 * ============================================================ */
function patchDataJs(content, changes) {
  let out = content;
  const missed = [];
  const WINDOW = 900;

  for (const c of changes) {
    const anchor = 'short: ' + JSON.stringify(c.model);
    const at = out.indexOf(anchor);
    if (at === -1) {
      missed.push({ model: c.model, field: c.field, reason: '未找到 short 锚点' });
      continue;
    }

    const end = Math.min(out.length, at + WINDOW);
    let win = out.slice(at, end);

    if (c.field === 'updated') {
      const re = /(updated:\s*")([\d-]+)(")/;
      if (!re.test(win)) {
        missed.push({ model: c.model, field: c.field, reason: '窗口内未找到 updated' });
        continue;
      }
      win = win.replace(re, `$1${c.newVal}$3`);
    } else {
      const re = new RegExp('(' + c.field + ':\\s*)(-?[\\d.]+)');
      if (!re.test(win)) {
        missed.push({ model: c.model, field: c.field, reason: '窗口内未找到 ' + c.field });
        continue;
      }
      win = win.replace(re, '$1' + c.newVal);
    }

    out = out.slice(0, at) + win + out.slice(end);
  }

  return { content: out, missed };
}

/* ============================================================
 * 7. 更新文件头注释与 META.updated 的日期
 * ============================================================ */
function patchDate(content, dateStr) {
  let out = content;
  out = out.replace(/(更新时间：)\d{4}-\d{2}-\d{2}/, `$1${dateStr}`);
  out = out.replace(/(var META\s*=\s*\{[\s\S]*?updated:\s*")([\d-]+)(")/, `$1${dateStr}$3`);
  return out;
}

/* ============================================================
 * 8. 价格合理性判定（fetch-prices 与 verify-data 共用同一套阈值）
 *    返回 { action: 'accept' | 'warn' | 'reject', reason }
 *    —— 单位/解析错误必须在这里就被拒绝，绝不能进 data.js。
 * ============================================================ */
function judgePrice(oldVal, newVal) {
  const n = parseFloat(newVal);
  if (!isFinite(n) || n <= 0) {
    return { action: 'reject', reason: `非正数或非法数字（${newVal}）` };
  }
  if (n < SANITY.pmMin || n > SANITY.pmMax) {
    return { action: 'reject', reason: `超出合理区间 ¥${SANITY.pmMin}~¥${SANITY.pmMax}/百万` };
  }

  const o = parseFloat(oldVal);
  if (isFinite(o) && o > 0) {
    const up = n / o;
    const down = o / n;
    if (up > SANITY.maxRatio) {
      return { action: 'reject', reason: `较上次放大 ${Math.round(up).toLocaleString()} 倍，疑似单位换算错误` };
    }
    if (down > SANITY.maxRatio) {
      return { action: 'reject', reason: `较上次缩小 ${Math.round(down).toLocaleString()} 倍，疑似单位换算错误` };
    }
    const delta = Math.abs(n - o) / o;
    if (delta > SANITY.warnDelta) {
      return { action: 'warn', reason: `较上次变动 ${(delta * 100).toFixed(0)}%` };
    }
  }

  return { action: 'accept', reason: '' };
}

/* ============================================================
 * 9. 比较两个价格值，判断是否需要更新（浮点误差容忍 0.01）
 * ============================================================ */
function priceChanged(oldVal, newVal) {
  const o = parseFloat(oldVal);
  const n = parseFloat(newVal);
  if (isNaN(o) || isNaN(n)) return String(oldVal) !== String(newVal);
  return Math.abs(o - n) > 0.01;
}

/* ============================================================
 * 10. 生成变更摘要
 * ============================================================ */
function summarizeChanges(changes) {
  const priceChanges = changes.filter(c => c.field !== 'updated');
  if (!priceChanges.length) return '✅ 所有价格无变化，无需更新。';

  const lines = [`📋 共 ${priceChanges.length} 处价格变更：`];
  for (const c of priceChanges) {
    const o = parseFloat(c.oldVal);
    const n = parseFloat(c.newVal);
    const arrow = n > o ? '↑' : '↓';
    const pct = o ? (((n - o) / o) * 100).toFixed(1) : 'N/A';
    const label = c.field === 'inputPm' ? '输入' : '输出';
    const sign = (o && n > o) ? '+' : '';
    lines.push(`  ${arrow} ${c.model} ${label}: ¥${o} → ¥${n} (${sign}${pct}%) [${c.source}]`);
  }
  return lines.join('\n');
}

module.exports = {
  SANITY,
  extractText,
  parseHtmlPrices,
  fetchWithRetry,
  readDataJs,
  parseDataJs,
  patchDataJs,
  patchDate,
  judgePrice,
  priceChanged,
  summarizeChanges,
};

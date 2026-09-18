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
 * 2b. 价格文本解析：把「¥2/百万tokens」「$0.27/1M」「0.001元/千tokens」
 *     这类单元格解析成结构化结果。解析不出返回 null。
 *     关键：没有币种标记（¥/$/元/美元）的数字一律不当作价格，
 *          避免把「3,500万 Tokens」这类配额数字误当单价。
 * ============================================================ */
function parsePriceText(raw) {
  if (!raw) return null;
  const s = String(raw)
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return null;

  let currency = null;
  if (/[$]|USD|美元/i.test(s)) currency = 'USD';
  if (/[¥￥]|CNY|RMB|人民币|(?:^|\s)元/.test(s)) currency = 'CNY';
  if (!currency) return null;

  // 计价单位：每多少 token（缺省按每百万）
  let perTokens = 1e6;
  if (/\/\s*1?k\b|每\s*千|per\s*1?k\s|1k\s*tok/i.test(s)) perTokens = 1e3;
  else if (/\/\s*1?m\b|每\s*百万|per\s*1m\s|百万/i.test(s)) perTokens = 1e6;

  // 取第一个数字（支持千分位逗号）
  const m = s.match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!m) return null;
  const value = parseFloat(m[1].replace(/,/g, ''));
  if (!isFinite(value) || value <= 0) return null;

  return { value, currency, perTokens };
}

/** 把 parsePriceText 的结果换算成「元 / 每百万 token」 */
function toYuanPerMillion(parsed, fx) {
  if (!parsed) return null;
  const rate = parsed.currency === 'USD' ? (fx || 7.1) : 1;
  return parsed.value * (1e6 / parsed.perTokens) * rate;
}

/* ============================================================
 * 2c. 通用「模型定价表」解析器
 *     逐行拆 <tr> → 拆单元格 → 第一个单元格当模型名，
 *     其余单元格用 parsePriceText 识别，取前两个能识别的当 输入价/输出价。
 *     opts:
 *       fx        - 美元→人民币汇率（默认 7.1）
 *       only      - 白名单数组：只返回名称能对上这些关键字的行（强烈建议传，
 *                   否则页面上的表头/页脚/无关数字都会混进来）
 *       log       - 日志函数
 * ============================================================ */
function parseModelPriceTable(html, opts = {}) {
  const out = {};
  if (!html) return out;
  const fx = opts.fx || 7.1;
  const only = Array.isArray(opts.only) && opts.only.length ? opts.only : null;
  const log = opts.log || (() => {});
  const found = [];

  const rows = String(html).match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  for (const row of rows) {
    const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
    if (cells.length < 3) continue;

    const texts = cells.map(c =>
      String(c).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ').trim()
    );

    const name = texts[0];
    if (!name || name.length > 80) continue;
    // 跳过表头/说明行
    if (/^(模型|名称|价格|单价|计费|输入|输出|说明|备注|model|name|price|input|output|tier|plan)s?$/i.test(name)) continue;

    const prices = [];
    for (let i = 1; i < texts.length && prices.length < 2; i++) {
      const parsed = parsePriceText(texts[i]);
      if (parsed) prices.push(toYuanPerMillion(parsed, fx));
    }
    if (prices.length < 2) continue;

    const entry = { input: Number(prices[0].toFixed(4)), output: Number(prices[1].toFixed(4)) };
    if (only) {
      const hit = only.find(k => {
        const kt = toTokens(k).sort().join(' ');
        const nt = toTokens(name).sort().join(' ');
        return nt === kt;
      });
      if (hit) { out[hit] = entry; found.push(`${name} → ${hit} ¥${entry.input}/¥${entry.output}`); }
      continue;
    }
    out[name] = entry;
    found.push(`${name} ¥${entry.input}/¥${entry.output}`);
  }

  if (found.length) log(`  ℹ 表格解析出 ${found.length} 行：${found.slice(0, 6).join('；')}${found.length > 6 ? ' …' : ''}`);
  return out;
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

    // 窗口自适应：个别模型的 desc/priceSrc 很长，900 字符可能不够，逐步扩窗到 3600
    let end = Math.min(out.length, at + WINDOW);
    let win = out.slice(at, end);
    for (const w of [1800, 3600]) {
      const re = c.field === 'updated'
        ? /(updated:\s*")([\d-]+)(")/
        : new RegExp('(' + c.field + ':\\s*)(-?[\\d.]+)');
      const tryEnd = Math.min(out.length, at + w);
      if (re.test(out.slice(at, tryEnd))) { end = tryEnd; win = out.slice(at, tryEnd); break; }
    }

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
    // 打印源侧原始键名，出问题能一眼看出是哪个源、匹配到了什么名字
    const from = c.matchedKey ? ` ← 源名 "${c.matchedKey}"` : '';
    lines.push(`  ${arrow} ${c.model} ${label}: ¥${o} → ¥${n} (${sign}${pct}%) [${c.source}${from}]`);
  }
  return lines.join('\n');
}

/* ============================================================
 * 11. 判断源侧返回的「模型名」是否是噪声（表头 / 纯数字 / 过短）
 * ============================================================ */
function isNoiseName(raw) {
  const s = String(raw == null ? '' : raw).toLowerCase().replace(/[\s_]+/g, ' ').trim();

  if (!s) return true;
  if (s.length < 4) return true;                 // "2.0"、"G 4" 这类碎片
  if (/^[\d.\s\-_/]+$/.test(s)) return true;      // 纯数字，如 "2.0"、"0.5"、"3.1"
  if (/^(模型|名称|价格|单价|输入|输出|计费|单位|说明|备注|合计)$/.test(s)) return true;
  if (/^(model|models?|name|names?|price|pricing|input|output|token|tokens?|per|unit|total|free|paid|tier|plan|context|rpm|tpm)s?$/i.test(s)) return true;
  if (/^(and|the|or|for|is|are|at|to|of|with| priced at )/.test(s)) return true;  // 正文片段

  return false;
}

/* ============================================================
 * 12. 源侧模型名 → data.js 条目的匹配
 *
 *     ⚠️ 事故教训：旧的「双向 includes」过于宽松 —— 源返回 "2.0" 时，
 *        "美团 longcat 2.0".includes("2.0") 为真，于是把 ¥7.1（=1 美元整）
 *        写进了 LongCat 2.0 的 outputPm。
 *     现在只允许：
 *       a) 精确匹配（规范化大小写与空白后）
 *       b) 别名表
 *       c) 核心词元完全相等（忽略中文厂商词 / latest·preview·chat 等修饰 / 日期后缀）
 *
 *     演进史（三次都被真实数据打回来，规则才收紧到现在这样）：
 *       ① 双向 includes  → "2.0" 命中 "美团 LongCat 2.0"，把 ¥7.1 写成输出价
 *       ② 前缀包含       → 既匹配不上 "LongCat 2.0"→"美团 LongCat 2.0"，
 *                          又让 "claude sonnet 4" 串味到 "Claude Sonnet 4.6"
 *       ③ 词元子集       → GPT-5.6 Luna 被 "gpt-5.6-luna-pro:batch" 命中（-50% 是 batch 折扣）
 *                          GPT-5.5 被 "gpt-5.5-pro:batch" 命中（+200%），o3 被 "o3-mini-high" 命中
 *       ⇒ 只要允许「一方包含另一方」，变体后缀（-pro / -mini / :batch / -vision-exp）
 *         就一定会污染基础款。故最终要求核心词元【完全相等】。
 *     最后仍由调用方保证「唯一命中」，宁可漏更新也不可配错模型。
 * ============================================================ */
function matchModel(sourceName, modelShort, modelName) {
  const norm = (v) => String(v == null ? '' : v).toLowerCase().replace(/[\s_]+/g, ' ').trim();
  const s = norm(sourceName);
  const short = norm(modelShort);
  const name = norm(modelName);

  if (isNoiseName(s)) return false;
  if (!short && !name) return false;

  // a) 精确匹配
  if (s === short || s === name) return true;

  // b) 特殊映射表（处理命名不一致）
  const ALIAS = {
    'gpt-5.5': 'gpt-5.5', 'gpt-5.5-pro': 'gpt-5.5 pro',
    'claude-sonnet-4': 'claude sonnet 4',
    'deepseek-v4-flash': 'deepseek-v4-flash',
    'deepseek-v3.2': 'deepseek-v3.2',
    'gemini-3-pro': 'gemini 3 pro',
  };
  if (ALIAS[s] === short || ALIAS[short] === s) return true;

  // c) 核心词元必须「完全相等」（忽略厂商词与版本/日期类修饰）
  //    这是被真实数据打出来的规则：OpenRouter 的 id 大量带变体后缀
  //    （gpt-5.6-luna-pro:batch / o3-mini-high / deepseek-v4-flash-vision-exp），
  //    只要允许「一方包含另一方」，这些变体就会命中基础款，写出完全错误的价格。
  if (sameCore(s, short) || sameCore(s, name)) return true;

  return false;
}

/** 拆分为规范化词元
 *  连字符/下划线/斜杠一律视作分隔符：这样 "claude-sonnet-4"（OpenRouter 风格）
 *  与 "Claude Sonnet 4"（本表风格）会得到相同的词元集合。
 *  注意不要拆小数点——"9.9" 必须保持为一个词元。 */
function toTokens(v) {
  return String(v == null ? '' : v)
    .toLowerCase()
    .replace(/[\s_\-/]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/* 匹配时可忽略的词元：
 *   - 中文厂商词（美团 / 千问 / 智谱 / 月之暗面 / 混元 / 豆包…）
 *     本表的 short 会带中文厂商名，而源侧（OpenRouter 等）剥掉前缀后没有，故双侧都忽略。
 *   - 版本/上架状态类修饰：latest / preview / chat / instruct / stable…
 *   - 纯 3~4 位数字（日期后缀，如 qwen3.8-max-0902 的 0902）
 * 注意：pro / mini / max / high / vision / exp / batch / flash / lite 等
 *       一律【不】忽略 —— 它们代表不同档位，忽略即误配。 */
const HARMLESS_TOKENS = new Set(['latest', 'preview', 'chat', 'instruct', 'it', 'stable', 'v1', 'v2']);
const CJK_ONLY_RE = /^[\u4e00-\u9fa5]+$/;
const DATE_TOKEN_RE = /^\d{3,4}$/;

function coreTokens(v) {
  return toTokens(v).filter(t => {
    if (CJK_ONLY_RE.test(t)) return false;
    if (HARMLESS_TOKENS.has(t)) return false;
    if (DATE_TOKEN_RE.test(t)) return false;
    return true;
  });
}

/** 核心词元集合是否完全一致（排序后逐一相等，且非空） */
function sameCore(a, b) {
  const A = coreTokens(a).sort();
  const B = coreTokens(b).sort();
  if (!A.length || A.length !== B.length) return false;
  return A.every((t, i) => t === B[i]);
}

module.exports = {
  SANITY,
  extractText,
  parseHtmlPrices,
  parsePriceText,
  toYuanPerMillion,
  parseModelPriceTable,
  fetchWithRetry,
  readDataJs,
  parseDataJs,
  patchDataJs,
  patchDate,
  judgePrice,
  priceChanged,
  summarizeChanges,
  isNoiseName,
  matchModel,
  toTokens,
  coreTokens,
};

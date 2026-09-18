/**
 * 通用工具函数库
 * ============================================================
 */

const AX = require('axios');

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
 *      usdToCny  - USD→CNY 汇率（默认 7.1）
 *      perUnit   - 每单位换算系数（默认 1e6 = 每百万）
 * ============================================================ */
function parseHtmlPrices(html, opts = {}) {
  const { pattern, usdToCny = 7.1, perUnit = 1e6 } = opts;
  if (!html || !pattern) return {};

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
      input: (input * usdToCny * perUnit).toFixed(2),
      output: (output * usdToCny * perUnit).toFixed(2),
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
 * 4. 安全解析 data.js（不执行，提取 JS 对象字面量）
 * ============================================================ */
function readDataJs(filePath) {
  const fs = require('fs');
  const content = fs.readFileSync(filePath, 'utf-8');
  return content;
}

/* ============================================================
 * 5. 从 data.js 内容中提取 MODELS 数组
 *    使用 Node.js vm 模块安全执行，不暴露全局
 * ============================================================ */
function parseDataJs(content) {
  const vm = require('vm');
  const sandbox = {};
  const context = vm.createContext(sandbox);
  // 提供 var 声明所需的上下文
  vm.runInContext(content, context);
  return {
    META: sandbox.META || {},
    MODELS: sandbox.MODELS || [],
    SUBSCRIPTIONS: sandbox.SUBSCRIPTIONS || [],
  };
}

/* ============================================================
 * 6. 将修改后的数据写回 data.js
 * ============================================================ */
function writeDataJs(filePath, content, models, subs) {
  const fs = require('fs');
  // 替换 MODELS 和 SUBSCRIPTIONS 数组
  let updated = content;
  updated = updated.replace(
    /var MODELS\s*=\s*\[[\s\S]*?\];/,
    'var MODELS = ' + JSON.stringify(models, null, 2) + ';'
  );
  updated = updated.replace(
    /var SUBSCRIPTIONS\s*=\s*\[[\s\S]*?\];/,
    'var SUBSCRIPTIONS = ' + JSON.stringify(subs, null, 2) + ';'
  );
  fs.writeFileSync(filePath, updated, 'utf-8');
}

/* ============================================================
 * 7. 比较两个价格值，判断是否需要更新
 * ============================================================ */
function priceChanged(oldVal, newVal) {
  if (oldVal === newVal) return false;
  const o = parseFloat(oldVal);
  const n = parseFloat(newVal);
  if (isNaN(o) || isNaN(n)) return true;
  // 浮点误差容忍：0.01
  return Math.abs(o - n) > 0.01;
}

/* ============================================================
 * 8. 生成变更摘要
 * ============================================================ */
function summarizeChanges(changes) {
  if (!changes.length) return '✅ 所有价格无变化，无需更新。';
  const lines = [`📋 共 ${changes.length} 处价格变更：`];
  for (const c of changes) {
    const arrow = c.newVal > c.oldVal ? '↑' : '↓';
    const pct = c.oldVal ? (((c.newVal - c.oldVal) / c.oldVal) * 100).toFixed(1) : 'N/A';
    lines.push(`  ${arrow} ${c.model}: ¥${c.oldVal} → ¥${c.newVal} (${pct}%) [${c.source}]`);
  }
  return lines.join('\n');
}

module.exports = {
  extractText,
  parseHtmlPrices,
  fetchWithRetry,
  readDataJs,
  parseDataJs,
  writeDataJs,
  priceChanged,
  summarizeChanges,
};

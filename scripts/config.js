/**
 * 价格数据源配置
 * ============================================================
 * 每个 source 定义：
 *   name       - 源名称（对应 data.js 中的 vendorTag）
 *   type       - 'html'（爬虫抓取）| 'api'（JSON API）
 *   url        - 定价页 URL
 *   models     - 需要抓取价格的模型名列表（匹配 data.js 中的 short/name）
 *   parse      - 解析函数：接收 { html } 或 { json }，返回 { modelName: { input, output, context, tags, desc } }
 *
 * 添加新数据源步骤：
 *   1. 在本文件底部添加 source 配置
 *   2. 实现对应的 parse 函数（或复用通用 parseHtml 工具）
 *   3. 在 data.js 中确保 model.short 与这里 models 匹配
 *
 * ⚠️⚠️ 单位约定（踩过大坑，务必按此写）：
 *   所有 fetch 函数的返回值必须是「人民币 / 每百万 token 」（数字或数字字符串）。
 *   - 页面报价是「美元 / 每百万 token」→ parseHtmlPrices({ quotePer: 1e6 })
 *   - 页面报价是「美元 / 每千 token」 → parseHtmlPrices({ quotePer: 1e3 })
 *   - 页面报价已经是「人民币 / 每百万」→ 直接返回，勿再乘任何系数
 *   2026-09-19 事故：旧参数 perUnit 是「乘数」，Google 解析器把
 *   「每百万美元价 1.20」又乘了 1e6，Gemini 2.5 Pro 被写成 ¥8,529,940，
 *   靠 verify-data 的异常检测才拦住。现已改成语义明确的 quotePer（除数）。
 * ============================================================
 */

const AX = require('axios');
const { parseHtmlPrices, extractText } = require('./lib');

/* ============================================================
 * 通用 HTML 价格解析器
 * ============================================================ */
async function fetchHtml(url) {
  const res = await AX.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PriceBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    timeout: 30000,
    maxRedirects: 5,
  });
  return res.data;
}

/* ============================================================
 * 1. SiliconFlow（硅基流动）— 有公开 API
 * ============================================================ */
const siliconflow = {
  name: '硅基流动',
  type: 'api',
  models: ['DeepSeek-V4-Flash', 'DeepSeek-V3.2', 'GLM-5.2', 'Kimi-K2.5', 'MiniMax-M2.7', '混元 Hy3 Preview'],
  fetch: async function() {
    const key = process.env.SILICONFLOW_API_KEY;
    if (!key) return null;
    const res = await AX.get('https://api.siliconflow.io/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      timeout: 15000,
    });
    const models = {};
    for (const m of res.data.data) {
      if (!m.input_price || !m.output_price) continue;
      // API 返回的就是「元 / 每百万 token」，直接使用，不要再乘任何系数。
      // 若实际单位不是这个，judgePrice 的区间检查会把它拦下来（宁可漏更新，不可写错价）。
      models[m.id] = {
        input: m.input_price,
        output: m.output_price,
      };
    }
    return models;
  },
};

/* ============================================================
 * 2. OpenAI — 爬定价页
 * ============================================================ */
const openai = {
  name: 'OpenAI',
  type: 'html',
  url: 'https://openai.com/api/pricing/',
  models: ['GPT-5.5', 'GPT-5.5 Pro', 'GPT-5.5-mini', 'GPT-5.5-nano', 'GPT-5.4', 'GPT-5.3', 'GPT-5.2', 'GPT-5', 'GPT-4.1', 'GPT-4o'],
  fetch: async function() {
    const html = await fetchHtml(this.url);
    // OpenAI 定价页是 Next.js SSR，价格数据在 __NEXT_DATA__ JSON 中
    const m = html.match(/__NEXT_DATA__[^>]*>(\{.*?\})<\/script>/s);
    if (!m) return null;
    try {
      const data = JSON.parse(m[1]);
      const models = {};
      if (data.props?.pageProps?.pricing) {
        for (const [id, info] of Object.entries(data.props.pageProps.pricing)) {
          models[id] = {
            input: parseFloat(info.input_price_per_1m_tokens || 0) * 7.1,
            output: parseFloat(info.output_price_per_1m_tokens || 0) * 7.1,
          };
        }
      }
      return models;
    } catch (e) {
      return null;
    }
  },
};

/* ============================================================
 * 3. Anthropic — 爬定价页
 * ============================================================ */
const anthropic = {
  name: 'Anthropic',
  type: 'html',
  url: 'https://www.anthropic.com/pricing',
  models: ['Claude Fable 5.1', 'Claude Opus 4.1', 'Claude Sonnet 4', 'Claude Haiku 4.5', 'Claude Haiku 3.5'],
  fetch: async function() {
    const html = await fetchHtml(this.url);
    const models = parseHtmlPrices(html, {
      pattern: /([A-Za-z0-9 .-]+?)\s*[\$]\s*([\d.]+)\s*(?:\/|、)\s*[\$]\s*([\d.]+)/g,
      usdToCny: 7.1,
      quotePer: 1e6,   // 页面报价为「美元 / 每百万 token」
    });
    return models;
  },
};

/* ============================================================
 * 4. Google — 爬 AI Studio 定价页
 * ============================================================ */
const google = {
  name: 'Google',
  type: 'html',
  url: 'https://ai.google.dev/pricing',
  models: ['Gemini 3 Pro', 'Gemini 3 Flash', 'Gemini 3 Flash-Lite', 'Gemini 2.5 Pro', 'Gemini 2.5 Flash', 'Gemini 2.5 Flash-Lite', 'Gemma 3 27B', 'Gemma 3 12B'],
  fetch: async function() {
    const html = await fetchHtml(this.url);
    const models = parseHtmlPrices(html, {
      pattern: /([A-Za-z0-9 .-]+?)\s*[\$]\s*([\d.]+)\s*\/\s*([\d.]+)/g,
      usdToCny: 7.1,
      quotePer: 1e6,   // 页面报价为「美元 / 每百万 token」
    });
    return models;
  },
};

/* ============================================================
 * 5. DeepSeek — 爬定价页
 * ============================================================ */
const deepseek = {
  name: '深度求索',
  type: 'html',
  url: 'https://api-docs.deepseek.com/quick_start/pricing',
  models: ['DeepSeek-V4-Pro', 'DeepSeek-V4-Flash', 'DeepSeek-V3.2', 'DeepSeek-V3.1', 'DeepSeek-V2'],
  fetch: async function() {
    const html = await fetchHtml(this.url);
    const models = {};
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
      if (cells.length < 3) continue;
      const name = extractText(cells[0]);
      const input = parseFloat(extractText(cells[1]).replace(/[^\d.]/g, ''));
      const output = parseFloat(extractText(cells[2]).replace(/[^\d.]/g, ''));
      if (name && input && output) {
        models[name] = { input, output };
      }
    }
    return models;
  },
};

/* ============================================================
 * 6. 阿里云百炼 — 爬定价页
 * ============================================================ */
const bailian = {
  name: '阿里云百炼',
  type: 'html',
  url: 'https://help.aliyun.com/zh/model-studio/product-overview/billing-methods',
  models: ['通义千问 Qwen3.6-Plus', '通义千问 Qwen3.5-Turbo', '通义千问 Qwen3.5-Max', '通义万相 Wan 2.6', '通义万相 Wan 2.5'],
  fetch: async function() {
    const html = await fetchHtml(this.url);
    const models = {};
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
      if (cells.length < 3) continue;
      const name = extractText(cells[0]);
      const input = parseFloat(extractText(cells[1]).replace(/[^\d.]/g, ''));
      const output = parseFloat(extractText(cells[2]).replace(/[^\d.]/g, ''));
      if (name && input && output) {
        models[name] = { input, output };
      }
    }
    return models;
  },
};

/* ============================================================
 * 7. 腾讯云 — 爬定价页
 * ============================================================ */
const tencentCloud = {
  name: '腾讯云',
  type: 'html',
  url: 'https://cloud.tencent.com/document/product/1729/97731',
  models: ['混元 Hy3 Preview', '混元 Hy3'],
  fetch: async function() {
    const html = await fetchHtml(this.url);
    if (html.length < 500) return null;
    const models = {};
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
      if (cells.length < 3) continue;
      const name = extractText(cells[0]);
      const input = parseFloat(extractText(cells[1]).replace(/[^\d.]/g, ''));
      const output = parseFloat(extractText(cells[2]).replace(/[^\d.]/g, ''));
      if (name && input && output) {
        models[name] = { input, output };
      }
    }
    return models;
  },
};

/* ============================================================
 * 8. 火山方舟 — 爬定价页
 * ============================================================ */
const volcengine = {
  name: '火山方舟',
  type: 'html',
  url: 'https://www.volcengine.com/docs/82379/1330010',
  models: ['豆包 Doubao-Seed-2.0', '豆包 Doubao-Seed-2.0-Pro', '豆包 Doubao-Seed-2.0-Mini', '豆包 Doubao-Seed-1.6'],
  fetch: async function() {
    const html = await fetchHtml(this.url);
    if (html.length < 500) return null;
    const models = {};
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
      if (cells.length < 3) continue;
      const name = extractText(cells[0]);
      const input = parseFloat(extractText(cells[1]).replace(/[^\d.]/g, ''));
      const output = parseFloat(extractText(cells[2]).replace(/[^\d.]/g, ''));
      if (name && input && output) {
        models[name] = { input, output };
      }
    }
    return models;
  },
};

/* ============================================================
 * 9. 百度千帆 — 爬定价页
 * ============================================================ */
const qianfan = {
  name: '百度千帆',
  type: 'html',
  url: 'https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Ilk54t1ne',
  models: ['文心一言 ERNIE 4.5', '文心一言 ERNIE 4.0 Turbo'],
  fetch: async function() {
    const html = await fetchHtml(this.url);
    if (html.length < 500) return null;
    const models = {};
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
      if (cells.length < 3) continue;
      const name = extractText(cells[0]);
      const input = parseFloat(extractText(cells[1]).replace(/[^\d.]/g, ''));
      const output = parseFloat(extractText(cells[2]).replace(/[^\d.]/g, ''));
      if (name && input && output) {
        models[name] = { input, output };
      }
    }
    return models;
  },
};

/* ============================================================
 * 10. xAI — 爬定价页
 * ============================================================ */
const xai = {
  name: 'xAI',
  type: 'html',
  url: 'https://x.ai/pricing',
  models: ['Grok 4', 'Grok 4 Fast', 'Grok 3'],
  fetch: async function() {
    const html = await fetchHtml(this.url);
    const models = parseHtmlPrices(html, {
      pattern: /([A-Za-z0-9 .-]+?)\s*[\$]\s*([\d.]+)\s*(?:\/|、)\s*[\$]\s*([\d.]+)/g,
      usdToCny: 7.1,
      quotePer: 1e6,   // 页面报价为「美元 / 每百万 token」
    });
    return models;
  },
};

/* ============================================================
 * 11. 月之暗面 Kimi
 * ============================================================ */
const kimi = {
  name: '月之暗面',
  type: 'html',
  url: 'https://platform.moonshot.cn/docs/pricing',
  models: ['Kimi-K2.7-Code', 'Kimi-K2.5', 'Kimi-K2-Thinking', 'Kimi-K1.5'],
  fetch: async function() {
    const html = await fetchHtml(this.url);
    const models = {};
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
      if (cells.length < 3) continue;
      const name = extractText(cells[0]);
      const input = parseFloat(extractText(cells[1]).replace(/[^\d.]/g, ''));
      const output = parseFloat(extractText(cells[2]).replace(/[^\d.]/g, ''));
      if (name && input && output) {
        models[name] = { input, output };
      }
    }
    return models;
  },
};

/* ============================================================
 * 12. 智谱 GLM
 * ============================================================ */
const glm = {
  name: '智谱',
  type: 'html',
  url: 'https://open.bigmodel.cn/pricing',
  models: ['智谱 GLM-5.3', '智谱 GLM-5.2', '智谱 GLM-4.5', '智谱 GLM-4-Flash-Long'],
  fetch: async function() {
    const html = await fetchHtml(this.url);
    const models = {};
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
      if (cells.length < 3) continue;
      const name = extractText(cells[0]);
      const input = parseFloat(extractText(cells[1]).replace(/[^\d.]/g, ''));
      const output = parseFloat(extractText(cells[2]).replace(/[^\d.]/g, ''));
      if (name && input && output) {
        models[name] = { input, output };
      }
    }
    return models;
  },
};

/* ============================================================
 * 所有数据源列表
 * ============================================================ */
const SOURCES = [
  siliconflow, openai, anthropic, google, deepseek,
  bailian, tencentCloud, volcengine, qianfan, xai, kimi, glm,
];

module.exports = { SOURCES, fetchHtml, parseHtmlPrices, extractText };

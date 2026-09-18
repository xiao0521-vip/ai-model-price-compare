/**
 * 价格数据源配置
 * ============================================================
 * 单位约定（⚠️ 全项目唯一的换算出口，务必按此写）：
 *   所有 fetch 函数的返回值必须是「人民币 / 每百万 token」。
 *   - 结构化 API：拿到什么单位就显式换算成 元/每百万
 *   - HTML 定价表：统一走 lib.parseModelPriceTable（自动识别 币种 + 每千/每百万）
 *   - 绝不手写 ×1e6 之类系数（2026-09-19 曾因此把 Gemini 2.5 Pro 写成 ¥8,529,940）
 *
 * HTML 源统一用 tableSource() 工厂创建：
 *   - 自动走带重试的抓取（网络抖动不再让整个源直接失败）
 *   - 解析走 parseModelPriceTable（能识别中文名/千分位/币种/计价单位）
 *   - 强制传 only 白名单：页面上的表头、页脚、无关数字进不了价格表
 *   - 白名单按「词元集合相等」匹配（连字符与空格等价）
 * ============================================================
 */

const AX = require('axios');
const {
  parseModelPriceTable, parseHtmlPrices, fetchWithRetry, extractText, toTokens, coreTokens,
} = require('./lib');

/** USD → CNY。⚠️ 全项目唯一定义处；verify-data 会校验它与 data.js META.fx 一致 */
const FX = 7.1;

/** 带 2 次重试的 HTML 抓取（网络抖动不再让整个源直接失败） */
async function fetchHtml(url) {
  return fetchWithRetry(url, 3, 2000);
}

/** 安全取数：价格可能是字符串，取不到返回 null */
function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(v);
  return isFinite(n) ? n : null;
}

/** 单位自适应：数值若明显是「每 token」口径（正数且 < 0.01），按 1e6 折算成「每百万」 */
function toPerMillion(v) {
  if (v === null) return null;
  return (v > 0 && v < 0.01) ? v * 1e6 : v;
}

/** 从对象里按多个候选键名取第一个能拿到的值（应对各平台字段命名差异） */
function pick(obj, keys) {
  for (const k of keys) {
    const v = k.split('.').reduce((o, part) => (o == null ? o : o[part]), obj);
    if (v !== null && v !== undefined && v !== '') return v;
  }
  return null;
}

/* ============================================================
 * HTML 表格源工厂
 * ============================================================ */
function tableSource(def) {
  return {
    name: def.name,
    type: 'html',
    url: def.url,
    models: def.models,
    fetch: async function () {
      const html = await fetchHtml(def.url);
      const r = parseModelPriceTable(html, {
        fx: FX,
        only: def.models,                 // 白名单：只收能对上总表短名的行
        log: (m) => console.log(m),
      });

      if (!Object.keys(r).length) {
        // 兜底：表格解析不到时，再用旧的正则方案试一次（部分平台不是 <table> 排版）
        const alt = parseHtmlPrices(html, {
          pattern: /([\u4e00-\u9fa5A-Za-z0-9 .\/\-_()（）]+?)\s*[¥￥$]\s*([\d,]+(?:\.\d+)?)\s*(?:\/|每)\s*([\d,]+(?:\.\d+)?)/g,
          usdToCny: FX,
          quotePer: 1e6,
        });
        const picked = {};
        for (const want of def.models) {
          for (const k of Object.keys(alt)) {
            if (toTokens(k).sort().join(' ') === toTokens(want).sort().join(' ')) {
              picked[want] = alt[k];
            }
          }
        }
        if (!Object.keys(picked).length) {
          console.log(`  ⚠ 页面既没有可用表格、正则兜底也没命中白名单（需人工校准该源）`);
          return null;
        }
        return picked;
      }
      return r;
    },
  };
}

/* ============================================================
 * 0. OpenRouter — 公开模型列表接口，自带价格，无需密钥
 *    实测 446 个模型、416 个含有效价格，覆盖面最广，是当前主力源。
 *    pricing.prompt / pricing.completion 单位为「美元 / 每 token」。
 *    注意：这是「聚合平台在售价」口径，与官方直连价可能略有差异。
 * ============================================================ */
const openrouter = {
  name: 'OpenRouter',
  type: 'api',
  apiBase: 'https://openrouter.ai/api/v1',
  models: [],
  // OpenRouter 报价与官方不一致、经人工核实后排除的模型（宁可漏更新，不可写错价）：
  //   gpt-5.6-sol —— OpenAI 官方促销价 $4/$20（至 2026-11-21，见 developers.openai.com），
  //                  OpenRouter 却报 $2/$10，恰好一半，来源不明 → 不采信
  //   deepseek-v4-flash / deepseek-v4-pro —— DeepSeek 官方价 ¥1/¥2、¥3/¥6（见 api-docs.deepseek.com），
  //                  OpenRouter 报聚合平台转售价（Flash 仅 1/3、Pro 高 3.8 倍），口径完全不同 → 不采信，
  //                  这两款锁定官方直连价，除非官方调价（改 data.js 时同步核对 priceSrc）
  skip: new Set(['gpt-5.6-sol', 'deepseek-v4-flash', 'deepseek-v4-pro']),
  fetch: async function() {
    const res = await AX.get(this.apiBase + '/models', {
      headers: { Accept: 'application/json' },
      timeout: 30000,
    });

    const list = (res.data && res.data.data) || [];
    if (!list.length) {
      console.log('  ℹ API 未返回模型列表');
      return null;
    }

    const models = {};
    let withPrice = 0;
    let skippedFree = 0;
    let skippedExcluded = 0;

    for (const m of list) {
      const p = m.pricing || {};
      const pin = num(p.prompt);
      const pout = num(p.completion);

      // 跳过免费/未定价（价格为 0 或缺失），免得把 ¥0 写进价格表
      if (pin === null || pout === null || pin <= 0 || pout <= 0) { skippedFree++; continue; }
      withPrice++;

      // id 形如 "~deepseek/deepseek-pro-latest"：先去 ~ 标记，再剥厂商前缀。
      let id = String(m.id || '').replace(/^~/, '').trim();
      if (id.includes('/')) id = id.slice(id.lastIndexOf('/') + 1);
      if (!id) continue;
      // 排除判定用核心词元比对而非精确 id：OpenRouter 的变体后缀（-latest、-0813、:batch 等）
      // 会让 deepseek-v4-flash 精确匹配失效，绕过名单。核心词元相同即视为同一模型。
      if (this.skip && this.skip.size) {
        const idCore = coreTokens(id).sort().join(' ');
        if ([...this.skip].some(s => coreTokens(s).sort().join(' ') === idCore)) {
          skippedExcluded++;
          continue;
        }
      }

      models[id] = {
        input: Number((pin * FX * 1e6).toFixed(4)),
        output: Number((pout * FX * 1e6).toFixed(4)),
      };
    }

    if (!withPrice) {
      console.log(`  ⚠ 没有可用价格（共 ${list.length} 个模型）`);
      return null;
    }

    const sample = Object.entries(models).slice(0, 3)
      .map(([k, v]) => `${k}=¥${v.input.toFixed(2)}/¥${v.output.toFixed(2)}`).join('  ');
    console.log(`  ℹ ${list.length} 个模型，${withPrice} 个含有效价格（跳过免费/未定价 ${skippedFree} 个、人工排除 ${skippedExcluded} 个）`);
    console.log(`  ℹ 样例：${sample}`);
    return models;
  },
};

/* ============================================================
 * 1. SiliconFlow（硅基流动）
 *    实测 /v1/models 只返回 id/object/created/owned_by，没有价格字段，
 *    因此该源无法用于抓价（代码保留，等接口增强；要价格需改抓定价页）。
 * ============================================================ */
const siliconflow = {
  name: '硅基流动',
  type: 'api',
  // ⚠️ 域名坑：api.siliconflow.io 不存在（2026-09-19 实测 DNS ENOTFOUND）。
  apiBase: 'https://api.siliconflow.cn/v1',
  models: ['DeepSeek-V4-Flash', 'DeepSeek-V3.2', 'GLM-5.2', 'Kimi-K2.5', 'MiniMax-M2.7', '混元 Hy3 Preview'],
  fetch: async function() {
    const key = process.env.SILICONFLOW_API_KEY;
    if (!key) return null;

    const res = await AX.get(this.apiBase + '/models', {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      timeout: 20000,
    });

    const list = (res.data && res.data.data) || [];
    if (!list.length) {
      console.log('  ℹ API 未返回模型列表');
      return null;
    }
    console.log(`  ℹ API 返回 ${list.length} 个模型，字段：${Object.keys(list[0]).join(', ')}`);

    const models = {};
    let withPrice = 0;
    for (const m of list) {
      const input = toPerMillion(num(pick(m, [
        'input_price', 'inputPrice', 'pricing.input', 'price.input', 'input_price_per_1m',
      ])));
      const output = toPerMillion(num(pick(m, [
        'output_price', 'outputPrice', 'pricing.output', 'price.output', 'output_price_per_1m',
      ])));
      if (input === null || output === null) continue;
      withPrice++;

      const id = String(m.id || '').trim();
      const key = id.includes('/') ? id.slice(id.lastIndexOf('/') + 1) : id;
      if (key) models[key] = { input, output };
    }

    if (!withPrice) {
      console.log('  ⚠ API 返回的模型不含价格字段 —— 这个接口无法提供价格，需要改为抓定价页');
      return null;
    }

    const sample = Object.entries(models).slice(0, 3)
      .map(([k, v]) => `${k}=¥${v.input}/¥${v.output}`).join('  ');
    console.log(`  ℹ ${withPrice} 个模型带价格字段，样例：${sample}`);
    return models;
  },
};

/* ============================================================
 * 2. OpenAI — 爬定价页
 *    旧实现的 __NEXT_DATA__ 正则用非贪婪匹配，JSON 几乎必然被截断；
 *    字段名 input_price_per_1m_tokens 也是臆造的。现改为：
 *      定位标记 → 取到最近的 </script> 为止 → JSON.parse（失败即放弃）
 *      → 打印字段结构便于校准
 * ============================================================ */
const openai = {
  name: 'OpenAI',
  type: 'html',
  url: 'https://openai.com/api/pricing/',
  models: ['GPT-5.6 Luna', 'GPT-5.6 Terra', 'GPT-5.6 Sol', 'GPT-5.5', 'GPT-5.5 Pro'],
  fetch: async function() {
    const html = await fetchHtml(this.url);

    const idx = html.indexOf('__NEXT_DATA__');
    if (idx === -1) {
      console.log('  ℹ 页面未找到 __NEXT_DATA__（可能改版），需人工校准');
      return null;
    }
    const start = html.indexOf('{', idx);
    const end = html.indexOf('</script>', idx);
    if (start === -1 || end === -1 || end <= start) return null;

    let data;
    try {
      data = JSON.parse(html.slice(start, end).trim());
    } catch (e) {
      console.log('  ⚠ __NEXT_DATA__ JSON 解析失败：' + e.message.slice(0, 80));
      return null;
    }

    // 结构未知，按候选路径找含价格的数组/对象
    const nodes = [
      data.props?.pageProps?.pricing,
      data.props?.pageProps?.models,
      data.props?.pageProps?.data,
    ].filter(Boolean);

    const models = {};
    for (const node of nodes) {
      const arr = Array.isArray(node) ? node : Object.values(node);
      for (const info of arr) {
        const id = pick(info, ['slug', 'id', 'name', 'model']);
        const pin = num(pick(info, [
          'input_price_per_1m_tokens', 'input_per_1m', 'price.input', 'pricing.input', 'input',
        ]));
        const pout = num(pick(info, [
          'output_price_per_1m_tokens', 'output_per_1m', 'price.output', 'pricing.output', 'output',
        ]));
        if (!id || pin === null || pout === null || pin <= 0 || pout <= 0) continue;
        // 官方页单位是「美元/每百万」，直接乘汇率
        models[id] = { input: Number((pin * FX).toFixed(4)), output: Number((pout * FX).toFixed(4)) };
      }
    }

    if (!Object.keys(models).length) {
      console.log('  ℹ __NEXT_DATA__ 里没找到价格字段，需人工校准（字段结构见下）');
      console.log('  ℹ 顶层键：' + Object.keys(data).join(', '));
      return null;
    }
    return models;
  },
};

/* ============================================================
 * 3~9. 表格型定价页（统一工厂，白名单强约束）
 * ============================================================ */
const anthropic = tableSource({
  name: 'Anthropic',
  url: 'https://www.anthropic.com/pricing',
  models: ['Claude Fable 5', 'Claude Fable 5.1', 'Claude Opus 5', 'Claude Opus 4.8',
           'Claude Opus 4.1', 'Claude Sonnet 5', 'Claude Sonnet 4.6', 'Claude Sonnet 4'],
});

const google = tableSource({
  name: 'Google',
  url: 'https://ai.google.dev/pricing',
  models: ['Gemini 3.8 Flash', 'Gemini 3.6 Flash', 'Gemini 3 Pro', 'Gemini 3 Flash',
           'Gemini 3 Flash-Lite', 'Gemini 2.5 Pro', 'Gemini 2.5 Flash', 'Gemini 2.5 Flash-Lite'],
});

const deepseek = tableSource({
  name: '深度求索',
  url: 'https://api-docs.deepseek.com/quick_start/pricing',
  models: ['DeepSeek-V4-Pro', 'DeepSeek-V4-Flash', 'DeepSeek-V3.2', 'DeepSeek-V3.1'],
});

const bailian = tableSource({
  name: '阿里云百炼',
  url: 'https://help.aliyun.com/zh/model-studio/product-overview/billing-methods',
  models: ['千问 Qwen3.8 Max', '千问 Qwen3.8 Flash', '千问 Qwen3.6 Plus', '通义千问 Qwen3.6-Plus',
           '千问 Qwen3.5 Turbo', '千问 Qwen3.5 Max'],
});

const tencentCloud = tableSource({
  name: '腾讯云',
  url: 'https://cloud.tencent.com/document/product/1729/97731',
  models: ['混元 Hy3 Preview', '混元 Hy3'],
});

const volcengine = tableSource({
  name: '火山方舟',
  url: 'https://www.volcengine.com/docs/82379/1330010',
  models: ['豆包 Seed 2.0 Pro', '豆包 Seed 2.0 Mini', '豆包 Doubao Seed2.1 Pro', '豆包 Seed 2.0'],
});

const qianfan = tableSource({
  name: '百度千帆',
  url: 'https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Ilk54t1ne',
  models: ['文心一言 ERNIE 4.5', '文心一言 ERNIE 4.0 Turbo'],
});

const kimi = tableSource({
  name: '月之暗面',
  url: 'https://platform.moonshot.cn/docs/pricing',
  models: ['Kimi K2.7 Code', 'Kimi K2.8 Preview', '月之暗面 Kimi K3', 'Kimi K2.6', 'Kimi K2.5'],
});

const glm = tableSource({
  name: '智谱',
  url: 'https://open.bigmodel.cn/pricing',
  models: ['智谱 GLM-5.3', '智谱 GLM-5.2', '智谱 GLM-5.3 Flash', '智谱 GLM-4.5'],
});

const xai = tableSource({
  name: 'xAI',
  url: 'https://x.ai/pricing',
  models: ['Grok 4.6', 'Grok 4.5', 'Grok 4.3', 'Grok 4'],
});

/* ============================================================
 * 所有数据源列表
 * ============================================================ */
// 顺序即优先级：同一模型同一字段被多个源给出不同值时，保留靠前那个
const SOURCES = [
  openrouter,          // 覆盖面最广、自带价格，放最前
  siliconflow, openai, anthropic, google, deepseek,
  bailian, tencentCloud, volcengine, qianfan, xai, kimi, glm,
];

module.exports = { SOURCES, FX, fetchHtml, parseModelPriceTable, parseHtmlPrices, extractText };

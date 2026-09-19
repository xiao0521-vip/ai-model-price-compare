/* =====================================================================
 * 主流 AI 大模型性价比对比总表 · 数据层
 * 更新时间：2026-09-19  |  收录 76 款模型 + 24 组订阅/套餐
 * ---------------------------------------------------------------------
 * 换算口径：
 *  - 所有价格已统一折算为「人民币 / 每百万 token」
 *  - 汇率 USD→CNY = 7.10（2026-09 参考）
 *  - 综合每百万 token 成本 = (输入×3 + 输出×1) / 4（行业典型 3:1 输入输出比）
 *  - 订阅/套餐按 50M 输入 + 10M 输出 token/月摊薄为等效百万 token 成本
 *  - 集分/点数制套餐按各平台官方公告的 Credit→token 折算比例推算等效单价（供参考，实际受模型/上下文/场景影响）
 * 数据来源：各模型官方直连接口定价 + 火山引擎方舟 / 阿里云百炼 / 腾讯云 /
 *           硅基流动 / 七牛云 / OpenRouter 等聚合与中转平台在售价
 * 说明：价格为采集快照，实时波动；商用前请以各平台官方定价页为准。
 * 注意：顶层必须用 var 声明（跨 <script> 标签访问；const 不挂 window）
 * ===================================================================== */

var META = {
  fx: 7.10,
  updated: "2026-09-19",
  note: "价格为采集快照（官方API直连价 + 国内聚合平台在售价）。订阅/套餐按行业平均用量（约50M输入+10M输出token/月，3:1比例）摊薄折算等效每百万token成本。所有价格统一人民币。标价实时变动，请以各平台官方定价页为准。",
};

/* 字段：name 全称 / short 简称 / family 系列 / vendor 厂商 / vendorZh 厂商中文
 *       type 类型 / billing 计费 / inputPm 输入 / outputPm 输出 / cnyOnly 是否人民币原生
 *       context 上下文 / tags 能力标签 / vendorTag 参考价平台 / priceSrc 来源与日期
 *       updated 更新时间 / desc 一行官方定位简介
 */

var MODELS = [
/* ============================ OpenAI ============================ */
{
  name: "GPT-5.6-Luna", short: "GPT-5.6 Luna", family: "GPT-5.6",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "性价比", billing: "per_token",
  inputPm: 1.42, outputPm: 8.52, cnyOnly: false, context: "400K",
  tags: ["text","multimodal","code","reasoning"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（$0.20/$1.20），2026-08-04 降价80%后成为GPT家族最划算档",
  updated: "2026-09-11",
  desc: "OpenAI 2026年8月大幅降价后的性价比档。GPT-5.6 家族轻量成员，延续即时/思考双模式，主打高频对话、轻量写作与低频推理，单位成本已下探至 DeepSeek 级。",
},
{
  name: "GPT-5-mini", short: "GPT-5 mini", family: "GPT-5",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "轻量", billing: "per_token",
  inputPm: 1.78, outputPm: 14.20, cnyOnly: false, context: "400K",
  tags: ["text","multimodal","code"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（$0.25/$2.00）",
  updated: "2026-09-11",
  desc: "GPT-5 家族轻量档，相比 GPT-4.1-mini 推理与指令遵循明显提升，适合批量内容生成、客服意图分类、表单抽取等中频任务。",
},
{
  name: "GPT-5.4-nano", short: "GPT-5.4 nano", family: "GPT-5.4",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "轻量", billing: "per_token",
  inputPm: 1.42, outputPm: 8.88, cnyOnly: false, context: "400K",
  tags: ["text","multimodal","code"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（$0.20/$1.25）",
  updated: "2026-09-11",
  desc: "GPT-5.4 家族最小档，主打超低延迟与极低成本，面向海量分类、抽取、改写、格式转换等轻任务，几乎无推理负担。",
},
{
  name: "GPT-4.1-nano", short: "GPT-4.1 nano", family: "GPT-4.1",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "轻量", billing: "per_token",
  inputPm: 0.71, outputPm: 2.84, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","code","longctx"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（$0.10/$0.40），1M超长上下文",
  updated: "2026-09-11",
  desc: "GPT-4.1 系列最轻量款，1M 上下文在同价位罕见，适合超长文档切片处理、批量抽取等高频低价值任务。",
},
{
  name: "GPT-4o-mini", short: "GPT-4o mini", family: "GPT-4o",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "轻量", billing: "per_token",
  inputPm: 1.07, outputPm: 4.26, cnyOnly: false, context: "128K",
  tags: ["text","multimodal","code"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（$0.15/$0.60）",
  updated: "2026-09-11",
  desc: "GPT-4o 轻量版，原生多模态、低延迟，是上一代主力中的性价比之选，广泛用于端侧 Agent 与多轮闲聊。",
},
{
  name: "GPT-5-nano", short: "GPT-5 nano", family: "GPT-5",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "轻量", billing: "per_token",
  inputPm: 0.36, outputPm: 2.84, cnyOnly: false, context: "400K",
  tags: ["text","multimodal","code"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（$0.05/$0.40）",
  updated: "2026-09-11",
  desc: "GPT-5 家族最小档，输入仅 $0.05/百万 token，超低延迟，适合分类、抽取、格式转换等海量轻任务。",
},
{
  name: "GPT-4.1-mini", short: "GPT-4.1 mini", family: "GPT-4.1",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "性价比", billing: "per_token",
  inputPm: 2.84, outputPm: 11.36, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","code","longctx"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（$0.40/$1.60）",
  updated: "2026-09-11",
  desc: "GPT-4.1 系列均衡轻量款，1M 上下文 + 稳定指令遵循，适合文档问答、RAG 生成等中频通用任务。",
},
{
  name: "o4-mini", short: "o4-mini", family: "o4",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "推理", billing: "per_token",
  inputPm: 7.81, outputPm: 31.24, cnyOnly: false, context: "200K",
  tags: ["text","reasoning","code","research"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（$1.10/$4.40），支持5折Batch",
  updated: "2026-09-11",
  desc: "OpenAI 轻量推理模型，兼顾速度与多步思考，主打数学、逻辑、代码调试等需要推理但不必上旗舰的任务。",
},
{
  name: "o3", short: "o3", family: "o3",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "推理", billing: "per_token",
  inputPm: 14.20, outputPm: 56.80, cnyOnly: false, context: "200K",
  tags: ["text","reasoning","code","research"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（$2.00/$8.00），支持5折Batch",
  updated: "2026-09-11",
  desc: "OpenAI 高阶推理专用模型，深度思考链长，擅长复杂推理、竞赛级数学与代码调试，但延迟高，不适合高频轻量场景。",
},
{
  name: "GPT-4.1", short: "GPT-4.1", family: "GPT-4.1",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "通用均衡", billing: "per_token",
  inputPm: 14.20, outputPm: 56.80, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","code","longctx"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（$2.00/$8.00），支持5折Batch",
  updated: "2026-09-11",
  desc: "GPT-4.1 家族主力款，1M 超长上下文、多模态输入，指令遵循稳定，是上一代通用任务主力，现仍广泛部署。",
},
{
  name: "GPT-5.6-Terra", short: "GPT-5.6 Terra", family: "GPT-5.6",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "通用均衡", billing: "per_token",
  inputPm: 14.20, outputPm: 85.20, cnyOnly: false, context: "400K",
  tags: ["text","multimodal","code","reasoning"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（$2.00/$12.00），长上下文输入超400K额外加价",
  updated: "2026-09-11",
  desc: "GPT-5.6 家族均衡主力（也是 ChatGPT 免费/Go 用户默认模型），综合写作、代码与多模态能力，适配日常生产。",
},
{
  name: "GPT-4o", short: "GPT-4o", family: "GPT-4o",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "通用均衡", billing: "per_token",
  inputPm: 17.75, outputPm: 71.00, cnyOnly: false, context: "128K",
  tags: ["text","multimodal","code"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（$2.50/$10.00），支持5折Batch",
  updated: "2026-09-11",
  desc: "OpenAI 经典多模态旗舰，视觉理解成熟、生态资料最全，广泛用于图文理解、多语言翻译与内容审核。",
},
{
  name: "GPT-5.5", short: "GPT-5.5", family: "GPT-5.5",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "通用旗舰", billing: "per_token",
  inputPm: 35.50, outputPm: 213.00, cnyOnly: false, context: "400K",
  tags: ["text","multimodal","code","reasoning"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（$5.00/$30.00），支持5折Batch",
  updated: "2026-09-11",
  desc: "GPT-5 系列高阶旗舰，比 GPT-5 推理与代码质量更稳，主打复杂分析、报告生成与企业级 Agent 底座。",
},
{
  name: "GPT-5.6-Sol", short: "GPT-5.6 Sol", family: "GPT-5.6",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "通用旗舰", billing: "per_token",
  inputPm: 28.40, outputPm: 142.00, cnyOnly: false, context: "400K",
  tags: ["text","multimodal","code","reasoning","agent"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（促销 $4.00/$20.00 至2026-11-21，之后 $5/$30）；超272K输入按2×/1.5×计费",
  promoUntil: "2026-11-21", regularPm: 35.50, regularOutPm: 213.00,
  updated: "2026-09-19",
  desc: "GPT-5.6 旗舰（ChatGPT Plus/Pro 主力模型），统一推理档位滑块、深度推理+代码+智能体能力最强，面向高价值复杂任务。",
},
{
  name: "GPT-5.5-Pro", short: "GPT-5.5 Pro", family: "GPT-5.5",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "推理", billing: "per_token",
  inputPm: 213.00, outputPm: 1278.00, cnyOnly: false, context: "400K",
  tags: ["text","reasoning","research","code"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenAI官方直连（$30.00/$180.00）",
  updated: "2026-09-11",
  desc: "OpenAI 顶级推理档，输出价 $180/百万 token，主打竞赛级数学、科研推导与超长链思考，用量少但单价极高。",
},

/* =========================== Anthropic ========================== */
{
  name: "Claude-Haiku-3.5", short: "Claude Haiku 3.5", family: "Claude 3.5",
  vendor: "Anthropic", vendorZh: "Anthropic", type: "轻量", billing: "per_token",
  inputPm: 5.68, outputPm: 28.40, cnyOnly: false, context: "200K",
  tags: ["text","multimodal","code","reasoning"],
  vendorTag: "Anthropic官方",
  priceSrc: "Anthropic官方直连（$0.80/$4.00），batch/flex 5折",
  updated: "2026-09-11",
  desc: "Anthropic Haiku 系列上一代主力，低延迟低单价，仍常用于大规模生产调用与智能体高频 Step。",
},
{
  name: "Claude-Haiku-4.5", short: "Claude Haiku 4.5", family: "Claude 5",
  vendor: "Anthropic", vendorZh: "Anthropic", type: "轻量", billing: "per_token",
  inputPm: 7.10, outputPm: 35.50, cnyOnly: false, context: "200K",
  tags: ["text","multimodal","code","reasoning"],
  vendorTag: "Anthropic官方",
  priceSrc: "Anthropic官方直连（$1.00/$5.00），batch/flex 5折",
  updated: "2026-09-11",
  desc: "Anthropic 即时经济档，低延迟起效快，相比 Haiku 3.5 推理显著提升，适合大规模生产调用与智能体高频 Step，是 Claude 阵营性价比首选。",
},
{
  name: "Claude-Sonnet-5", short: "Claude Sonnet 5", family: "Claude 5",
  vendor: "Anthropic", vendorZh: "Anthropic", type: "通用均衡", billing: "per_token",
  inputPm: 14.20, outputPm: 71.00, cnyOnly: false, context: "1M",
  tags: ["text","multimodal","code","reasoning","agent"],
  vendorTag: "Anthropic官方",
  priceSrc: "Anthropic官方直连（优惠 $2.00/$10.00 至2026-08-31，之后 $3/$15），batch 5折",
  updated: "2026-09-18",
  desc: "Claude 5 中坚，1M 长上下文、代码生成与智能体任务兼顾，常见于 Claude Pro 订阅，是质量与成本平衡的标杆。",
},
{
  name: "Claude-Sonnet-4.6", short: "Claude Sonnet 4.6", family: "Claude 4",
  vendor: "Anthropic", vendorZh: "Anthropic", type: "通用均衡", billing: "per_token",
  inputPm: 21.30, outputPm: 106.50, cnyOnly: false, context: "200K",
  tags: ["text","multimodal","code","reasoning"],
  vendorTag: "Anthropic官方",
  priceSrc: "Anthropic官方直连（$3.00/$15.00），batch 5折",
  updated: "2026-09-11",
  desc: "Claude Sonnet 系列上一代版本，200K 上下文，综合能力稳定，仍常用于对质量有要求但不必上旗舰的场景。",
},
{
  name: "Claude-Opus-5", short: "Claude Opus 5", family: "Claude 5",
  vendor: "Anthropic", vendorZh: "Anthropic", type: "通用旗舰", billing: "per_token",
  inputPm: 35.50, outputPm: 177.50, cnyOnly: false, context: "1M",
  tags: ["text","multimodal","code","reasoning","research","agent"],
  vendorTag: "Anthropic官方",
  priceSrc: "Anthropic官方直连（$5.00/$25.00），batch 5折",
  updated: "2026-09-11",
  desc: "Claude 旗舰梯队，1M 上下文，深度推理、长文创作、复杂代码与多步智能体任务最强，面向质量绝对敏感的高价值场景。",
},
{
  name: "Claude-Opus-4.8", short: "Claude Opus 4.8", family: "Claude 4",
  vendor: "Anthropic", vendorZh: "Anthropic", type: "通用旗舰", billing: "per_token",
  inputPm: 35.50, outputPm: 177.50, cnyOnly: false, context: "300K",
  tags: ["text","multimodal","code","reasoning","research"],
  vendorTag: "Anthropic官方",
  priceSrc: "Anthropic官方直连（$5.00/$25.00），质量约达 Opus 4 的97%",
  updated: "2026-09-11",
  desc: "Claude 上一代旗舰，较 Opus 4 大幅降价且保留约97%质量，是质量敏感型任务的高性价比替代。",
},
{
  name: "Claude-Opus-4.1", short: "Claude Opus 4.1", family: "Claude 4",
  vendor: "Anthropic", vendorZh: "Anthropic", type: "通用旗舰", billing: "per_token",
  inputPm: 106.50, outputPm: 532.50, cnyOnly: false, context: "200K",
  tags: ["text","multimodal","code","reasoning"],
  vendorTag: "Anthropic官方",
  priceSrc: "Anthropic官方直连（$15.00/$75.00），仍在线的上一代旗舰",
  updated: "2026-09-11",
  desc: "Claude 4 系列旗舰，单价远高于同代后续版本，仅在需要特定行为一致性或历史基线对齐的场景保留。",
},
{
  name: "Claude-Fable-5", short: "Claude Fable 5", family: "Claude Fable",
  vendor: "Anthropic", vendorZh: "Anthropic", type: "通用旗舰", billing: "per_token",
  inputPm: 71.00, outputPm: 355.00, cnyOnly: false, context: "1M",
  tags: ["text","multimodal","code","reasoning","research","agent"],
  vendorTag: "Anthropic官方",
  priceSrc: "Anthropic官方直连（$10.00/$50.00），2026-09-01 被 Fable 5.1 取代",
  updated: "2026-09-11",
  desc: "Claude 家族最强档，1M 上下文，长文创作与深度研究表现突出；已被 Fable 5.1 取代，仍用于需对齐旧版本行为的场景。",
},
{
  name: "Claude-Fable-5.1", short: "Claude Fable 5.1", family: "Claude Fable",
  vendor: "Anthropic", vendorZh: "Anthropic", type: "通用旗舰", billing: "per_token",
  inputPm: 71.00, outputPm: 355.00, cnyOnly: false, context: "1M",
  tags: ["text","multimodal","code","reasoning","research","agent"],
  vendorTag: "Anthropic官方",
  priceSrc: "Anthropic官方直连（$10.00/$50.00），2026-09-01 上线取代 Fable 5",
  updated: "2026-09-18",
  desc: "Claude 家族当前最强档，1M 上下文、缓存命中价 $1.00/百万 token，主打长文创作、深度研究与复杂多步智能体任务。",
},

/* ============================ Google ============================ */
{
  name: "Gemini-2.0-Flash", short: "Gemini 2.0 Flash", family: "Gemini 2.0",
  vendor: "Google", vendorZh: "谷歌", type: "轻量", billing: "per_token",
  inputPm: 0.71, outputPm: 2.84, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","longctx"],
  vendorTag: "Google官方",
  priceSrc: "Google AI Studio/Vertex 直连（$0.10/$0.40）",
  updated: "2026-09-11",
  desc: "Google Gemini 2.0 系列轻量款，1M 超长上下文，常用于大规模低成本文档处理与多模态初筛。",
},
{
  name: "Gemini-2.5-Flash-Lite", short: "Gemini 2.5 Flash-Lite", family: "Gemini 2.5",
  vendor: "Google", vendorZh: "谷歌", type: "轻量", billing: "per_token",
  inputPm: 0.71, outputPm: 2.84, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","longctx"],
  vendorTag: "Google官方",
  priceSrc: "Google官方直连（$0.10/$0.40），超200K上下文加价",
  updated: "2026-09-11",
  desc: "Gemini 2.5 系列超轻量款，输入仅 $0.10/百万 token，1M 上下文，适合海量文档处理与低成本大规模调用。",
},
{
  name: "Gemini-3.1-Flash-Lite", short: "Gemini 3.1 Flash-Lite", family: "Gemini 3",
  vendor: "Google", vendorZh: "谷歌", type: "轻量", billing: "per_token",
  inputPm: 1.78, outputPm: 10.65, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","longctx","code"],
  vendorTag: "Google官方",
  priceSrc: "Google AI Studio/Vertex 直连（$0.25/$1.50）",
  updated: "2026-08-04",
  desc: "Gemini 3 系列超低成本轻量档，1M 超长上下文、原生多模态，适合海量文档处理与低成本大规模调用。",
},
{
  name: "Gemini-2.5-Flash", short: "Gemini 2.5 Flash", family: "Gemini 2.5",
  vendor: "Google", vendorZh: "谷歌", type: "性价比", billing: "per_token",
  inputPm: 2.13, outputPm: 17.75, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","longctx","code"],
  vendorTag: "Google官方",
  priceSrc: "Google官方直连（$0.30/$2.50），超200K上下文加价",
  updated: "2026-09-11",
  desc: "Gemini 2.5 系列均衡款，1M 上下文、原生多模态，兼顾吞吐与质量，是 Google 阵营主力生产模型。",
},
{
  name: "Gemini-3.5-Flash-Lite", short: "Gemini 3.5 Flash-Lite", family: "Gemini 3.5",
  vendor: "Google", vendorZh: "谷歌", type: "性价比", billing: "per_token",
  inputPm: 2.13, outputPm: 17.75, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","longctx","code"],
  vendorTag: "Google官方",
  priceSrc: "Google官方直连（$0.30/$2.50），超200K上下文加价",
  updated: "2026-08-04",
  desc: "Gemini 3.5 轻量增强档，比 3.1 Flash-Lite 稍贵但能力更均衡，主打高吞吐、长上下文与低成本通用任务。",
},
{
  name: "Gemini-3-Flash", short: "Gemini 3 Flash", family: "Gemini 3",
  vendor: "Google", vendorZh: "谷歌", type: "性价比", billing: "per_token",
  inputPm: 3.55, outputPm: 21.30, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","longctx","code"],
  vendorTag: "Google官方",
  priceSrc: "Google官方直连（$0.50/$3.00），超200K上下文加价",
  updated: "2026-08-04",
  desc: "Gemini 3 系列均衡款，1M 上下文与多模态输入全面，主打高吞吐通用任务与长文档处理。",
},
{
  name: "Gemini-3.8-Flash", short: "Gemini 3.8 Flash", family: "Gemini 3.8",
  vendor: "Google", vendorZh: "谷歌", type: "性价比", billing: "per_token",
  inputPm: 5.33, outputPm: 26.63, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","longctx","code"],
  vendorTag: "Google官方",
  priceSrc: "Google官方直连（促销 $0.75/$3.75 至2026-12-31，2027年1月起 $1.50/$7.50）",
  updated: "2026-09-11",
  desc: "Google 最新 Flash 档，当前处于促销期（12月底后翻倍），1M 上下文 + 多模态，主打高吞吐与长文档处理。",
},
{
  name: "Gemini-2.5-Pro", short: "Gemini 2.5 Pro", family: "Gemini 2.5",
  vendor: "Google", vendorZh: "谷歌", type: "通用旗舰", billing: "per_token",
  inputPm: 8.88, outputPm: 71.00, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","longctx","code","reasoning"],
  vendorTag: "Google官方",
  priceSrc: "Google官方直连（$1.25/$10.00），超200K上下文加价",
  updated: "2026-09-11",
  desc: "Gemini 上一代旗舰，1M 超长上下文与深度研究能力，长文档与代码库处理表现出色，价格远低于当代旗舰。",
},
{
  name: "Gemini-3.6-Flash", short: "Gemini 3.6 Flash", family: "Gemini 3.6",
  vendor: "Google", vendorZh: "谷歌", type: "性价比", billing: "per_token",
  inputPm: 5.33, outputPm: 26.63, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","longctx","code","reasoning"],
  vendorTag: "Google官方",
  priceSrc: "Google官方直连（促销 $0.75/$3.75 至2026-12-31，之后 $1.50/$7.50），超200K上下文加价",
  promoUntil: "2026-12-31", regularPm: 10.65, regularOutPm: 53.25,
  updated: "2026-09-19",
  desc: "Gemini 3.6 系列均衡档，输出单价低于同级 3.5 Flash，主打高吞吐通用任务与长文档处理。",
},
{
  name: "Gemini-3.5-Flash", short: "Gemini 3.5 Flash", family: "Gemini 3.5",
  vendor: "Google", vendorZh: "谷歌", type: "性价比", billing: "per_token",
  inputPm: 10.65, outputPm: 63.90, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","longctx","code","reasoning"],
  vendorTag: "Google官方",
  priceSrc: "Google官方直连（$1.50/$9.00），超200K上下文加价",
  updated: "2026-09-11",
  desc: "Gemini 3.5 系列均衡主力，1M 上下文 + 多模态，兼顾质量与吞吐，是 Google 阵营中位主流生产模型。",
},
{
  name: "Gemini-3-Pro", short: "Gemini 3 Pro", family: "Gemini 3",
  vendor: "Google", vendorZh: "谷歌", type: "通用旗舰", billing: "per_token",
  inputPm: 14.20, outputPm: 85.20, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","longctx","code","reasoning","research"],
  vendorTag: "Google官方",
  priceSrc: "Google官方直连（$2.00/$12.00），超200K上下文对全部token加价",
  updated: "2026-09-11",
  desc: "谷歌旗舰，1M 超长上下文与 Deep Research 深度研究著称，多模态输入全面，主打长文档、代码库与科研检索。",
},

/* ============================= xAI ============================= */
{
  name: "Grok-4.3", short: "Grok 4.3", family: "Grok 4",
  vendor: "xAI", vendorZh: "xAI", type: "通用均衡", billing: "per_token",
  inputPm: 8.88, outputPm: 17.75, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","code","reasoning","longctx"],
  vendorTag: "xAI官方",
  priceSrc: "xAI官方直连（$1.25/$2.50），超200K上下文加价",
  updated: "2026-08-04",
  desc: "xAI 中档主力，1M 长上下文，可插值 X/Twitter 生态实时数据，适合社交媒体分析与长对话，价格处于中位。",
},
{
  name: "Grok-4.5", short: "Grok 4.5", family: "Grok 4",
  vendor: "xAI", vendorZh: "xAI", type: "通用均衡", billing: "per_token",
  inputPm: 14.20, outputPm: 42.60, cnyOnly: false, context: "500K",
  tags: ["text","multimodal","code","reasoning","longctx"],
  vendorTag: "xAI官方",
  priceSrc: "xAI官方直连（$2.00/$6.00），超200K上下文加价",
  updated: "2026-09-11",
  desc: "Grok 4 系列进阶档，较 4.3 推理与代码能力明显提升，500K 上下文，深度绑定 X 生态实时数据。",
},
{
  name: "Grok-4.6", short: "Grok 4.6", family: "Grok 4",
  vendor: "xAI", vendorZh: "xAI", type: "通用旗舰", billing: "per_token",
  inputPm: 14.20, outputPm: 42.60, cnyOnly: false, context: "500K",
  tags: ["text","multimodal","code","reasoning","longctx"],
  vendorTag: "xAI官方",
  priceSrc: "xAI官方直连（$2.00/$6.00），超200K上下文加价",
  updated: "2026-09-11",
  desc: "Grok 当前最新旗舰，500K 上下文，较 4.5 在多步推理与实时信息利用上进一步提升，主打动态信息场景。",
},

/* ========================== 其他海外厂商 ========================= */
{
  name: "Amazon-Nova-Micro", short: "Amazon Nova Micro", family: "Nova",
  vendor: "Amazon", vendorZh: "亚马逊", type: "轻量", billing: "per_token",
  inputPm: 0.25, outputPm: 1.00, cnyOnly: false, context: "128K",
  tags: ["text","code"],
  vendorTag: "Amazon Bedrock",
  priceSrc: "Amazon Bedrock 直连（$0.035/$0.140），5折Batch",
  updated: "2026-09-11",
  desc: "AWS 自研超轻量模型，输入仅 $0.035/百万 token，全表最低价之一，主打分类、路由、摘要等超高频轻任务。",
},
{
  name: "Llama-3.1-8B-Instruct", short: "Llama 3.1 8B", family: "Llama 3.1",
  vendor: "Meta", vendorZh: "Meta", type: "轻量", billing: "per_token",
  inputPm: 0.36, outputPm: 0.57, cnyOnly: false, context: "128K",
  tags: ["text","code"],
  vendorTag: "Groq托管",
  priceSrc: "Groq 托管价（$0.050/$0.080）",
  updated: "2026-09-11",
  desc: "Meta 开源小模型，8B 参数可在边缘部署，Groq 推理极低延迟，主打开源可控与端侧轻量任务。",
},
{
  name: "Amazon-Nova-Lite", short: "Amazon Nova Lite", family: "Nova",
  vendor: "Amazon", vendorZh: "亚马逊", type: "轻量", billing: "per_token",
  inputPm: 0.43, outputPm: 1.70, cnyOnly: false, context: "300K",
  tags: ["text","multimodal","longctx","code"],
  vendorTag: "Amazon Bedrock",
  priceSrc: "Amazon Bedrock 直连（$0.060/$0.240），5折Batch",
  updated: "2026-09-11",
  desc: "AWS 自研轻量多模态模型，300K 上下文，主打文档理解、检索与低成本 AWS 内部工作负载。",
},
{
  name: "Mistral-Small-4", short: "Mistral Small 4", family: "Mistral Small",
  vendor: "Mistral", vendorZh: "Mistral", type: "轻量", billing: "per_token",
  inputPm: 1.07, outputPm: 4.26, cnyOnly: false, context: "131K",
  tags: ["text","code","reasoning"],
  vendorTag: "Mistral官方",
  priceSrc: "Mistral 官方直连（$0.15/$0.60），5折Batch",
  updated: "2026-09-11",
  desc: "Mistral 轻量档，欧盟合规与隐私保障突出，主打开源可自托管、欧洲受监管行业的批量任务。",
},
{
  name: "Mistral-Large-3", short: "Mistral Large 3", family: "Mistral Large",
  vendor: "Mistral", vendorZh: "Mistral", type: "性价比", billing: "per_token",
  inputPm: 3.55, outputPm: 10.65, cnyOnly: false, context: "131K",
  tags: ["text","code","reasoning"],
  vendorTag: "Mistral官方",
  priceSrc: "Mistral 官方直连（$0.50/$1.50），5折Batch",
  updated: "2026-09-11",
  desc: "Mistral 均衡主力，质量对标主流中档模型且价格更低，欧盟合规与数据驻留是核心卖点。",
},
{
  name: "Amazon-Nova-Pro", short: "Amazon Nova Pro", family: "Nova",
  vendor: "Amazon", vendorZh: "亚马逊", type: "通用均衡", billing: "per_token",
  inputPm: 5.68, outputPm: 22.68, cnyOnly: false, context: "300K",
  tags: ["text","multimodal","longctx","code"],
  vendorTag: "Amazon Bedrock",
  priceSrc: "Amazon Bedrock 直连（$0.80/$3.20），5折Batch",
  updated: "2026-09-11",
  desc: "AWS 自研中档多模态模型，300K 上下文，深度集成 Bedrock 与 S3/知识层，主打 AWS 生态内的企业工作负载。",
},
{
  name: "Llama-3.3-70B-Instruct", short: "Llama 3.3 70B", family: "Llama 3.3",
  vendor: "Meta", vendorZh: "Meta", type: "通用均衡", billing: "per_token",
  inputPm: 4.19, outputPm: 2.272, cnyOnly: false, context: "128K",
  tags: ["text","code","reasoning","longctx"],
  vendorTag: "Groq托管",
  priceSrc: "Groq 托管价（$0.59/$0.79），其他云各异",
  updated: "2026-09-18",
  desc: "Meta 开源主力，70B 参数可在边缘/Groq 超低延迟部署，各云差异定价，主打开源可控部署与自托管场景。",
},
{
  name: "Meta-Muse-Spark-1.1", short: "Muse Spark 1.1", family: "Muse",
  vendor: "Meta", vendorZh: "Meta", type: "通用均衡", billing: "per_token",
  inputPm: 8.88, outputPm: 30.18, cnyOnly: false, context: "128K",
  tags: ["text","multimodal","code"],
  vendorTag: "Meta官方",
  priceSrc: "Meta 官方直连（$1.25/$4.25）",
  updated: "2026-08-04",
  desc: "Meta 新推出的闭源商用系列，多模态输入、中等定价，主打与 Llama 开源系列互补的企业级托管场景。",
},
{
  name: "Cohere-Command-A", short: "Cohere Command A", family: "Command",
  vendor: "Cohere", vendorZh: "Cohere", type: "通用均衡", billing: "per_token",
  inputPm: 17.75, outputPm: 71.00, cnyOnly: false, context: "256K",
  tags: ["text","code","reasoning","longctx","agent"],
  vendorTag: "第三方转售",
  priceSrc: "Cohere 未在官方定价页公示，第三方转售价 $2.50/$10.00；最大输出 8K",
  updated: "2026-08-04",
  desc: "Cohere 面向企业 RAG 的主力模型，检索增强生成任务对标 GPT-5，最大输出 8K 限制，主打企业知识库场景。",
},
{
  name: "Amazon-Nova-Premier", short: "Amazon Nova Premier", family: "Nova",
  vendor: "Amazon", vendorZh: "亚马逊", type: "通用旗舰", billing: "per_token",
  inputPm: 17.75, outputPm: 88.75, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","longctx","code","reasoning"],
  vendorTag: "Amazon Bedrock",
  priceSrc: "Amazon Bedrock 直连（$2.50/$12.50），5折Batch",
  updated: "2026-09-11",
  desc: "AWS 自研旗舰，1M 超长上下文与多模态输入，主打长文档分析、企业 RAG 与 AWS 生态内的旗舰级任务。",
},

/* ======================= DeepSeek（深度求索） ====================== */
{
  name: "DeepSeek-V4-Flash", short: "DeepSeek V4 Flash", family: "DeepSeek V4",
  vendor: "DeepSeek", vendorZh: "深度求索", type: "性价比", billing: "per_token",
  inputPm: 1, outputPm: 2, cnyOnly: true, context: "1.0M",
  tags: ["text","code","reasoning","longctx"],
  vendorTag: "官方",
  priceSrc: "DeepSeek官方 + 阿里百炼/硅基流动同价（¥1/¥2），另有错峰分时价低至5折",
  updated: "2026-09-18",
  desc: "深度求索旗舰级开源模型中最具性价比的一档，V4 系列延续低价策略，主打端侧/大规模并发调用，代码与推理均衡，是国产模型中按量成本最低的主力款。",
},
{
  name: "DeepSeek-V3.2", short: "DeepSeek V3.2", family: "DeepSeek V3.2",
  vendor: "DeepSeek", vendorZh: "深度求索", type: "轻量", billing: "per_token",
  inputPm: 1.9099, outputPm: 2.84, cnyOnly: true, context: "164K",
  tags: ["text","code","reasoning"],
  vendorTag: "硅基流动",
  priceSrc: "硅基流动在售价（¥4/¥6），缓存命中 ¥0.4/百万token；2026-06-30 起调整至该价",
  updated: "2026-09-18",
  desc: "DeepSeek V3 系列迭代版，位于 V4 之下提供更经济的通用推理档；缓存命中价仅为输入的一成，适合高重复前缀的批量任务与 RAG。",
},
{
  name: "DeepSeek-V4-Pro", short: "DeepSeek V4 Pro", family: "DeepSeek V4",
  vendor: "DeepSeek", vendorZh: "深度求索", type: "通用均衡", billing: "per_token",
  inputPm: 3, outputPm: 6, cnyOnly: true, context: "1.0M",
  tags: ["text","code","reasoning","longctx"],
  vendorTag: "官方",
  priceSrc: "DeepSeek官方 ¥3/¥6；百炼同价，硅基流动 ¥12/¥24（按美元结算基准上浮）",
  updated: "2026-09-18",
  desc: "深度求索旗舰档，对标最前沿通用能力，实测质量接近 Claude Opus 级，价格仅其零头，适合对质量要求高的生产环境与多数商业 Agent 底座。",
},

/* ========================== 阿里·通义千问 ========================= */
{
  name: "Qwen3.8-Flash", short: "千问 Qwen3.8 Flash", family: "Qwen3.8",
  vendor: "Alibaba", vendorZh: "阿里", type: "性价比", billing: "per_token",
  inputPm: 1.065, outputPm: 3.337, cnyOnly: true, context: "1.0M",
  tags: ["text","code","reasoning","longctx"],
  vendorTag: "阿里云百炼",
  priceSrc: "阿里云百炼直连（¥0.8/¥2.7）",
  updated: "2026-09-18",
  desc: "通义千问 3.8 均衡轻量档，百万 token 成本不足 1 元，主打高频通用、编程与长上下文，性价比极高。",
},
{
  name: "Qwen3.8-Omni-Flash", short: "千问 Qwen3.8 Omni-Flash", family: "Qwen3.8-Omni",
  vendor: "Alibaba", vendorZh: "阿里", type: "多模态", billing: "per_token",
  inputPm: 1.6, outputPm: 5.4, cnyOnly: true, context: "1.0M",
  tags: ["multimodal","voice","realtime","longctx","code","agent","text"],
  vendorTag: "千问AI平台",
  priceSrc: "2026-09-18 新发，支持文本/图像/音频/视频全模态输入，音频输入价较上代降超98%（参考估算，以官方公示为准）",
  updated: "2026-09-18",
  desc: "2026-09-18 新发布的原生态全模态模型，支持文本/图像/音频/视频四类输入与 1M 长上下文，可完成音视频创作、会议纪要、口语陪练等 Agent 交付，较上代 Qwen3.5-Omni-Plus 平均评测提升超26%。",
},
{
  name: "Qwen3.8-Max", short: "千问 Qwen3.8 Max", family: "Qwen3.8",
  vendor: "Alibaba", vendorZh: "阿里", type: "通用旗舰", billing: "per_token",
  inputPm: 14.2, outputPm: 42.6, cnyOnly: true, context: "1.0M",
  tags: ["text","multimodal","code","reasoning","longctx"],
  vendorTag: "阿里云百炼",
  priceSrc: "阿里云百炼直连（¥12/¥36），总参2.4万亿、激活95B",
  updated: "2026-09-18",
  desc: "通义千问 3.8 旗舰，2.4万亿参数原生多模态、百万 token 上下文，编程与复杂推理最强，对标国产第一梯队，主打企业级生产与 Agent 底座。",
},

/* ========================== 月之暗面·Kimi ========================= */
{
  name: "Kimi-K2.6", short: "Kimi K2.6", family: "Kimi K2",
  vendor: "Moonshot", vendorZh: "月之暗面", type: "性价比", billing: "per_token",
  inputPm: 6.745, outputPm: 28.4, cnyOnly: true, context: "100W",
  tags: ["text","multimodal","code","reasoning","longctx"],
  vendorTag: "Kimi官方",
  priceSrc: "Kimi官方直连（¥4/¥21）",
  updated: "2026-09-18",
  desc: "Kimi K2 系列前代版本，100万 token 上下文，价格低于 K2.6 高速版，仍广泛用于长文本与批量任务。",
},
{
  name: "Kimi-K2.7-Code", short: "Kimi K2.7 Code", family: "Kimi K2.7",
  vendor: "Moonshot", vendorZh: "月之暗面", type: "编程", billing: "per_token",
  inputPm: 5.014, outputPm: 22.791, cnyOnly: true, context: "262K",
  tags: ["text","code","reasoning","agent"],
  vendorTag: "硅基流动",
  priceSrc: "硅基流动在售价（¥6.1/¥26.98，$0.859/$3.8）；另有高速版价格翻倍换180 Token/秒输出速度",
  updated: "2026-09-18",
  desc: "Kimi 编程专用版本，针对代码生成与多步 Agent 调用优化，提供标准与高速双层级，主打 AI 编程与工具调用场景。",
},
{
  name: "Kimi-K2.8-Preview", short: "Kimi K2.8 Preview", family: "Kimi K2.8",
  vendor: "Moonshot", vendorZh: "月之暗面", type: "通用均衡", billing: "per_token",
  inputPm: 6.5, outputPm: 27.0, cnyOnly: true, context: "100W",
  tags: ["text","multimodal","code","reasoning","longctx"],
  vendorTag: "Kimi官方",
  priceSrc: "Kimi官方（约 ¥6.5/¥27），支持低/高/极限三档思考强度与图像视频输入",
  updated: "2026-09-16",
  desc: "Kimi K2.8 预览版，官方定位『接近旗舰 K3、成本更低』的主力模型，支持三档思考强度与多媒体输入，100万 token 上下文向会员开放。",
},
{
  name: "Kimi-K3", short: "月之暗面 Kimi K3", family: "Kimi K3",
  vendor: "Moonshot", vendorZh: "月之暗面", type: "通用旗舰", billing: "per_token",
  inputPm: 12.07, outputPm: 60.35, cnyOnly: true, context: "100W",
  tags: ["text","multimodal","code","reasoning","longctx"],
  vendorTag: "阿里云百炼/官方",
  priceSrc: "阿里百炼在售价（¥20/¥100），官方API另计；2.8万亿参数、100万token上下文、原生视觉",
  updated: "2026-09-19",
  desc: "月之暗面 2026-07 发布的 2.8万亿参数开源旗舰，100万 token 上下文、原生视觉理解，代码盲测登顶多项榜单，定价约为 OpenAI 旗舰的七分之一。",
},

/* ============================ 智谱·GLM =========================== */
{
  name: "GLM-5.3-Flash", short: "智谱 GLM-5.3 Flash", family: "GLM-5.3",
  vendor: "Zhipu", vendorZh: "智谱", type: "编程", billing: "per_token",
  inputPm: 0.639, outputPm: 2.13, cnyOnly: true, context: "200K",
  tags: ["text","code","reasoning","agent"],
  vendorTag: "七牛云AI",
  priceSrc: "七牛云 AI 大模型广场在售价（¥0.4/¥1.4）",
  updated: "2026-09-18",
  desc: "智谱 GLM-5.3 轻量版，输入仅 ¥0.4/百万 token，是国产编程模型中的最低价档，主打高并发代码补全与轻量 Agent 调用。",
},
{
  name: "GLM-5.2", short: "智谱 GLM-5.2", family: "GLM-5",
  vendor: "Zhipu", vendorZh: "智谱", type: "通用均衡", billing: "per_token",
  inputPm: 3.9362, outputPm: 12.371, cnyOnly: true, context: "200K",
  tags: ["text","code","reasoning","agent"],
  vendorTag: "七牛云AI",
  priceSrc: "七牛云在售价（¥4/¥18）；硅基流动在售价 ¥9.25/¥28.85（$1.302/$4.092）",
  updated: "2026-09-18",
  desc: "智谱 GLM-5 系列前代版本，200K 上下文，Agent 任务与工具调用见长，价格低于 GLM-5.3，适合成本敏感的生产场景。",
},
{
  name: "GLM-5.3", short: "智谱 GLM-5.3", family: "GLM-5",
  vendor: "Zhipu", vendorZh: "智谱", type: "通用均衡", billing: "per_token",
  inputPm: 6.461, outputPm: 20.306, cnyOnly: true, context: "200K",
  tags: ["text","code","reasoning","agent","longctx"],
  vendorTag: "阿里云百炼",
  priceSrc: "阿里百炼在售价（¥8/¥28）；OpenRouter 约 $1.12 起",
  updated: "2026-09-18",
  desc: "智谱新一代基座（50亿美元再融资支持研发），Agent 任务与复杂推理见长，深度接入 CodeBits/企业 RAG，主打可落地的智能体编程与工具调用。",
},

/* ============================ MiniMax ============================ */
{
  name: "MiniMax-M2.5", short: "MiniMax M2.5", family: "MiniMax M2",
  vendor: "MiniMax", vendorZh: "MiniMax", type: "性价比", billing: "per_token",
  inputPm: 1.917, outputPm: 7.668, cnyOnly: true, context: "200K",
  tags: ["text","code","reasoning","longctx"],
  vendorTag: "硅基流动",
  priceSrc: "硅基流动在售价（¥2.1/¥8.4）",
  updated: "2026-09-18",
  desc: "MiniMax M2 系列版本，低成本低吞吐稳定，适合高并发长上下文调用，是国产低价区的稳定选择。",
},
{
  name: "MiniMax-M3", short: "MiniMax M3", family: "MiniMax M3",
  vendor: "MiniMax", vendorZh: "MiniMax", type: "性价比", billing: "per_token",
  inputPm: 2.13, outputPm: 8.52, cnyOnly: true, context: "200K",
  tags: ["text","code","reasoning","longctx"],
  vendorTag: "阿里云百炼",
  priceSrc: "阿里百炼在售价（¥2.1/¥8.4，官方5折后）；另有1.5倍优先层级",
  updated: "2026-09-18",
  desc: "MiniMax 新一代均衡模型，低成本 + 高吞吐（另有优先层级加价换速度），主打高并发长上下文调用，是国产低价区的有力竞争者。",
},

/* ========================= 字节·豆包·火山方舟 ====================== */
{
  name: "Doubao-Seed-2.0-Mini", short: "豆包 Seed 2.0 Mini", family: "Doubao Seed 2.0",
  vendor: "ByteDance", vendorZh: "字节跳动", type: "性价比", billing: "per_token",
  inputPm: 0.71, outputPm: 2.84, cnyOnly: true, context: "128K",
  tags: ["text","code","reasoning"],
  vendorTag: "火山方舟",
  priceSrc: "火山引擎方舟直连（¥0.2/¥2）",
  updated: "2026-09-18",
  desc: "豆包轻量性价比档，输入仅 ¥0.2/百万 token，主打海量短信、客服、意图识别等低价值高频文本任务，是大厂自研模型里成本最低的一档。",
},
{
  name: "Doubao-Seed-2.0-Pro", short: "豆包 Seed 2.0 Pro", family: "Doubao Seed 2.0",
  vendor: "ByteDance", vendorZh: "字节跳动", type: "通用均衡", billing: "per_token",
  inputPm: 3.2, outputPm: 16.0, cnyOnly: true, context: "128K",
  tags: ["text","multimodal","code","reasoning"],
  vendorTag: "火山方舟",
  priceSrc: "火山引擎方舟直连（¥3.2/¥16）",
  updated: "2026-08-04",
  desc: "豆包 Seed 2.0 系列中档主力，较 Mini 版质量显著提升且价格仍低，适合对成本敏感又需一定质量的通用任务。",
},
{
  name: "Doubao-Seed-2.1-Pro", short: "豆包 Doubao Seed2.1 Pro", family: "Doubao Seed 2.1",
  vendor: "ByteDance", vendorZh: "字节跳动", type: "通用旗舰", billing: "per_token",
  inputPm: 6.0, outputPm: 30.0, cnyOnly: true, context: "128K",
  tags: ["text","multimodal","code","reasoning","agent"],
  vendorTag: "火山方舟",
  priceSrc: "火山引擎方舟直连（¥6/¥30）",
  updated: "2026-08-04",
  desc: "字节豆包旗舰，深度接入抖音生态与火山方舟，Agent 能力与多步任务见长，主打 C 端产品接入与国内大流量业务，输出价高于 DeepSeek 同级约 5 倍。",
},

/* ============================ 百度·文心 ============================ */
{
  name: "ERNIE-4.5-Turbo", short: "文心 ERNIE 4.5 Turbo", family: "ERNIE 4.5",
  vendor: "Baidu", vendorZh: "百度", type: "性价比", billing: "per_token",
  inputPm: 0.8, outputPm: 3.2, cnyOnly: true, context: "128K",
  tags: ["text","code","longctx"],
  vendorTag: "百度千帆",
  priceSrc: "百度千帆直连（¥0.0008/¥0.0032 元/千token 口径换算）",
  updated: "2026-08-01",
  desc: "百度文心 4.5 加速版，深度绑定百度搜索/百科知识库，检索增强与中文理解见长，主打国内搜索结合的中文业务，成本低廉。",
},

/* =========================== 腾讯·混元 ============================ */
{
  name: "HunYuan-Hy3-Preview", short: "混元 Hy3 Preview", family: "HunYuan Hy3",
  vendor: "Tencent", vendorZh: "腾讯", type: "性价比", billing: "per_token",
  inputPm: 1.278, outputPm: 4.26, cnyOnly: true, context: "262K",
  tags: ["text","multimodal","code","reasoning","longctx"],
  vendorTag: "硅基流动",
  priceSrc: "硅基流动在售价（$0.132/$0.528 折算）；腾讯云官方未公示按量 token 定价",
  updated: "2026-09-18",
  desc: "腾讯 2026-04 自研混元 3 代预览版，295B 总参 / 21B 激活的 MoE 架构，原生 256K 上下文，面向 Agent 工作负载优化，代码基准测试接近前沿水平；已接入 CodeBuddy 与腾讯云 Token Plan。",
},

/* ============================ 美团·LongCat ======================= */
{
  name: "LongCat-2.0", short: "美团 LongCat 2.0", family: "LongCat",
  vendor: "Meituan", vendorZh: "美团", type: "性价比", billing: "per_token",
  inputPm: 2.13, outputPm: 8.52, cnyOnly: false, context: "1.0M",
  tags: ["text","code","reasoning","longctx"],
  vendorTag: "OpenRouter",
  priceSrc: "OpenRouter 在售价（官方限时促销 $0.30/$1.20，原价 $0.75/$2.95）；2026-06-30 上线，最大输出 131K",
  updated: "2026-09-19",
  desc: "美团 LongCat 系列第二代，1049K 超长上下文、最大输出 131K，主打长文档处理与多步 Agent 编排，是互联网大厂自研模型的低价档代表。",
},

/* ============ 2026-09-19 扩充：主流厂商新一代旗舰（来源 OpenRouter 公开接口） ============ */
{
  name: "GPT-6-Astra", short: "GPT-6 Astra", family: "GPT-6",
  vendor: "OpenAI", vendorZh: "OpenAI", type: "通用旗舰", billing: "per_token",
  inputPm: 71.00, outputPm: 355.00, cnyOnly: false, context: "1.05M",
  tags: ["text","multimodal","code","reasoning","agent"],
  vendorTag: "OpenAI官方",
  priceSrc: "OpenRouter 聚合平台在售价（$10.00/$50.00），2026-09-19",
  updated: "2026-09-19",
  desc: "OpenAI GPT-6 系列旗舰，统一推理档位滑块与深度 Agent 能力，因需求过高曾一度限制订阅升级，是当前最强通用模型之一。",
},
{
  name: "DeepSeek-V4.1-Flash", short: "DeepSeek V4.1 Flash", family: "DeepSeek-V4.1",
  vendor: "深度求索", vendorZh: "深度求索", type: "性价比", billing: "per_token",
  inputPm: 1.06, outputPm: 4.26, cnyOnly: false, context: "1.0M",
  tags: ["text","code","reasoning","longctx"],
  vendorTag: "OpenRouter",
  priceSrc: "OpenRouter 聚合平台在售价（$0.15/$0.60），2026-09-19",
  updated: "2026-09-19",
  desc: "DeepSeek V4 系列最新轻量款，1M 上下文延续极致低价路线，是国产按量成本最低的主力之一。",
},
{
  name: "Hunyuan-Hy4-Preview", short: "混元 Hy4 Preview", family: "混元 Hy4",
  vendor: "腾讯", vendorZh: "腾讯", type: "通用旗舰", billing: "per_token",
  inputPm: 5.92, outputPm: 17.76, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","reasoning","longctx"],
  vendorTag: "OpenRouter",
  priceSrc: "OpenRouter 聚合平台在售价（$0.83/$2.50），2026-09-19",
  updated: "2026-09-19",
  desc: "腾讯混元新一代预览版，1M 上下文，多模态+推理一体，逐步接替 Hy3 成为腾讯系主力。",
},
{
  name: "Grok-4.20", short: "Grok 4.20", family: "Grok 4",
  vendor: "xAI", vendorZh: "xAI", type: "通用旗舰", billing: "per_token",
  inputPm: 8.88, outputPm: 17.75, cnyOnly: false, context: "2.0M",
  tags: ["text","multimodal","code","reasoning"],
  vendorTag: "OpenRouter",
  priceSrc: "OpenRouter 聚合平台在售价（$1.25/$2.50），2026-09-19",
  updated: "2026-09-19",
  desc: "xAI 当前最新款，2M 超长上下文为全表之最，输出单价仅为输入的 2 倍，长文档场景性价比突出。",
},
{
  name: "MiniMax-M2.7", short: "MiniMax M2.7", family: "MiniMax-M",
  vendor: "MiniMax", vendorZh: "MiniMax", type: "性价比", billing: "per_token",
  inputPm: 2.13, outputPm: 8.52, cnyOnly: false, context: "200K",
  tags: ["text","code","agent"],
  vendorTag: "OpenRouter",
  priceSrc: "OpenRouter 聚合平台在售价（$0.30/$1.20），2026-09-19",
  updated: "2026-09-19",
  desc: "MiniMax M 系列稳定版，Agent 任务表现出色，已进入腾讯云 Token Plan 等多个聚合平台的推荐清单。",
},
{
  name: "Mistral-Medium-3.5", short: "Mistral Medium 3.5", family: "Mistral Medium",
  vendor: "Mistral", vendorZh: "Mistral", type: "通用均衡", billing: "per_token",
  inputPm: 10.65, outputPm: 53.25, cnyOnly: false, context: "262K",
  tags: ["text","multimodal","code"],
  vendorTag: "OpenRouter",
  priceSrc: "OpenRouter 聚合平台在售价（$1.50/$7.50），2026-09-19",
  updated: "2026-09-19",
  desc: "法国 Mistral 的中端主力，欧洲合规友好，是本表首个收录的欧洲厂商模型。",
},
{
  name: "Qwen3.7-Max", short: "Qwen3.7 Max", family: "Qwen3.7",
  vendor: "阿里", vendorZh: "阿里", type: "通用旗舰", billing: "per_token",
  inputPm: 10.47, outputPm: 31.42, cnyOnly: false, context: "1.0M",
  tags: ["text","multimodal","code","reasoning"],
  vendorTag: "OpenRouter",
  priceSrc: "OpenRouter 聚合平台在售价（$1.47/$4.43），2026-09-19",
  updated: "2026-09-19",
  desc: "通义 Qwen3.7 代旗舰，1M 上下文，输出单价仅为同级旗舰的 1/3 左右，长文本大批量场景便宜明显。",
},
];

/* =====================================================================
 * 订阅 / 套餐档位（Agent 桌面工具 + 各平台 Token Plan）
 * 按 50M输入 + 10M输出 token/月（≈3:1）摊薄为等效百万 token 成本
 * ===================================================================== */
var SUBSCRIPTIONS = [
{
  name: "ChatGPT（OpenAI）", kind: "订阅",
  plans: [
    { tier: "免费", price: "¥0", feature: "有限 GPT-5.6 Luna/Terra" },
    { tier: "Go", price: "¥57/月", feature: "不限文本 + 图像/记忆（$8）" },
    { tier: "Plus", price: "¥142/月", feature: "GPT-5.6 Sol + 无限用量，含 Codex（$20）" },
    { tier: "Pro 5x", price: "¥710/月", feature: "5×Plus用量，5×Codex，约50次深度研究/月（$100）" },
    { tier: "Pro 20x", price: "¥1420/月", feature: "20×用量，Operator+高级语音，250次深度研究（$200，2026-09-10起暂停新注册）" },
    { tier: "Business", price: "¥178/席/月", feature: "含ChatGPT+Codex，团队协作（$25，年付$20）" },
    ],
  note: "含 Codex CLI（AI编程Agent）用量；美元按7.1换算。Pro $200 档自2026-09-10起暂停新注册与升级，因 GPT-6 Astra 需求过高，现有订阅不受影响。",
},
{
  name: "Claude（Anthropic）", kind: "订阅",
  plans: [
    { tier: "Free", price: "¥0", feature: "有限 Sonnet 5（每5小时重置）" },
    { tier: "Pro", price: "¥142/月（年付¥121/月）", feature: "Sonnet 5 + Opus 5 + Haiku 4.5，约5×免费额度（$20）" },
    { tier: "Max 5x", price: "¥710/月", feature: "约5×Pro用量，含 Fable 5（$100）" },
    { tier: "Max 20x", price: "¥1420/月", feature: "约20×Pro用量，重度 Agent/编程（$200）" },
    { tier: "Team", price: "¥213/席/月", feature: "团队协作，最低5席（$30，年付$25）" },
    ],
  note: "Claude Code 用量与账号共享5小时滚动窗口；Fable 5 自2026-07-20起改为 usage credits 提供，含一次性$100额度。",
},
{
  name: "Claude Code", kind: "订阅",
  plans: [
    { tier: "Pro", price: "¥142/月", feature: "共享 Claude Pro 额度" },
    { tier: "Max 5x", price: "¥710/月", feature: "5小时滚动窗口+周上限（$100）" },
    { tier: "Max 20x", price: "¥1420/月", feature: "重度终端编程（$200）" },
    ],
  note: "Anthropic 官方终端编程 Agent，与 claude.ai 共享额度；重度用户实际支出 ¥1,460~1,460/月 区间。",
},
{
  name: "Gemini AI Pro（Google）", kind: "订阅",
  plans: [
    { tier: "AI Plus", price: "¥65/月", feature: "Gemini 3 Flash/Flash-Lite + 更多存储" },
    { tier: "AI Pro", price: "¥142/月", feature: "Gemini 3 Pro + Deep Research（对标ChatGPT Plus）" },
    { tier: "AI Ultra", price: "¥1065~2348/月", feature: "最高档，最强推理与工具（$150，含视频生成额度）" },
    ],
  note: "深度绑定 Google One/Workspace 生态；原 Gemini CLI 已于2026-06-18停止请求支持，用户被引导迁移至 Antigravity CLI。",
},
{
  name: "腾讯云·Token Plan", kind: "套餐",
  plans: [
    { tier: "通用 Lite", price: "¥39/月", feature: "3,500万 Tokens/月（约70轮问答）；混元/Kimi-K2.5/GLM-5.1/GLM-5/MiniMax-M2.7 等 7 款" },
    { tier: "通用 Standard", price: "¥99/月", feature: "1亿 Tokens/月（约200轮问答），日常办公与轻量开发" },
    { tier: "通用 Pro", price: "¥299/月", feature: "3.2亿 Tokens/月，高频 AI 开发，配额是 Standard 的 3.2 倍" },
    { tier: "通用 Max", price: "¥599/月", feature: "6.5亿 Tokens/月，重度 AI 开发首选" },
    { tier: "Hy Lite（混元专属）", price: "¥28/月（首月¥14）", feature: "3,500万 Tokens/月；仅混元 Hy3 preview（295B总参/21B激活 MoE，256K上下文）" },
    { tier: "Hy Standard", price: "¥78/月（首月¥39）", feature: "1亿 Tokens/月" },
    { tier: "Hy Pro", price: "¥238/月", feature: "3.2亿 Tokens/月" },
    { tier: "Hy Max", price: "¥468/月", feature: "6.5亿 Tokens/月" },
    { tier: "企业版轻享", price: "2元/百万tokens 起", feature: "Auto 智能路由，5,000万 Tokens 起步" },
    { tier: "企业版专业", price: "月预算 ¥1,000–20,000", feature: "步长 ¥1,000，多 Key 配额分配，按部门/项目/业务线采购" },
    { tier: "新客赠送", price: "¥0", feature: "100万文本 + 100万 Embedding" },
    ],
  models: [
  {
    "name": "混元 Hy3 Preview",
    "type": "性价比",
    "tags": [
      "纯文本",
      "多模态",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "262K",
    "perToken": "¥0.94/¥3.75",
    "src": "硅基流动（腾讯官方未公示按量价）",
    "desc": "295B 总参 / 21B 激活 MoE，混元系主力"
  },
  {
    "name": "DeepSeek-V4-Flash",
    "type": "性价比",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "1.0M",
    "perToken": "¥1/¥2",
    "src": "深度求索官方",
    "desc": "国产按量成本最低主力"
  },
  {
    "name": "MiniMax-M2.7",
    "type": "性价比",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "200K",
    "perToken": "≈¥2.1/¥8.4（M2.5口径）",
    "src": "硅基流动",
    "desc": "低成本高吞吐"
  },
  {
    "name": "GLM-5.2",
    "type": "通用均衡",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "智能体"
    ],
    "context": "200K",
    "perToken": "¥9.25/¥28.85",
    "src": "硅基流动",
    "desc": "Agent 工具调用见长"
  },
  {
    "name": "Kimi-K2.5",
    "type": "性价比",
    "tags": [
      "纯文本",
      "多模态",
      "代码生成",
      "推理"
    ],
    "context": "128K",
    "perToken": "≈¥4/¥21（官方参考）",
    "src": "月之暗面官方",
    "desc": "Kimi K2 固定代理"
  }
    ],
  note: "“调用量”均按 DeepSeek 系标准抵扣口径换算。规则：缓存命中与未命中的输入/输出 Token 统一抵扣，不因命中缓存单独退还；额度不结转下月、不支持降配与退款；个人版仅支持生成 1 个 API Key。2026-08-31 起从“固定 token 额度”改为“积分抵扣”。官方支持 Claude Code，兼容 Cursor、Cline、CodeBuddy。",
},
{
  name: "阿里云百炼·Token Plan", kind: "套餐",
  plans: [
    { tier: "个人 Lite", price: "¥39/月（原¥60）", feature: "2,500 Credits/7天；文本/视觉多模态模型 + 联网搜索等 Harness 工具，1–2 Agent 并发" },
    { tier: "个人 Standard", price: "¥139/月（原¥180）", feature: "10,000 Credits/7天；4× Lite 用量，3–4 Agent 并发" },
    { tier: "个人 Pro", price: "¥499/月（原¥600）", feature: "40,000 Credits/7天；16× Lite 用量，6–8 Agent 并发" },
    { tier: "团队·标准坐席", price: "¥198/坐席/月", feature: "25,000 Credits/坐席/月，轻度使用 AI 辅助的团队成员" },
    { tier: "团队·高级坐席", price: "¥698/坐席/月", feature: "100,000 Credits/坐席/月，日常高频使用 AI 编码" },
    { tier: "团队·尊享坐席", price: "¥1,398/坐席/月", feature: "250,000 Credits/坐席/月，重度依赖 AI 编码的核心开发者" },
    { tier: "新客赠送", price: "¥0", feature: "超 7,000 万 Tokens（每模型 100 万），90 天有效期，覆盖千问/DeepSeek/Kimi/MiniMax/GLM" },
    ],
  models: [
  {
    "name": "Qwen3.8-Max",
    "type": "通用旗舰",
    "tags": [
      "纯文本",
      "多模态",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "1.0M",
    "perToken": "¥12/¥36",
    "src": "阿里云百炼",
    "desc": "万诚通义 3.8 旗舰"
  },
  {
    "name": "Qwen3.8-Flash",
    "type": "性价比",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "1.0M",
    "perToken": "¥0.8/¥2.7",
    "src": "阿里云百炼",
    "desc": "百万 token 成本不足 1 元"
  },
  {
    "name": "Qwen3.8-Omni-Flash",
    "type": "多模态",
    "tags": [
      "多模态",
      "语音",
      "实时",
      "长上下文",
      "代码生成",
      "智能体"
    ],
    "context": "1.0M",
    "perToken": "¥1.6/¥5.4",
    "src": "千问 AI 平台",
    "desc": "2026-09-18 新发全模态"
  },
  {
    "name": "DeepSeek-V4-Flash",
    "type": "性价比",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "1.0M",
    "perToken": "¥1/¥2",
    "src": "百炼同价",
    "desc": "新客赠送覆盖"
  },
  {
    "name": "Kimi-K3",
    "type": "通用旗舰",
    "tags": [
      "纯文本",
      "多模态",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "100万",
    "perToken": "¥20/¥100",
    "src": "阿里百炼",
    "desc": "月之暗面开源旗舰"
  },
  {
    "name": "MiniMax-M3",
    "type": "性价比",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "200K",
    "perToken": "¥2.1/¥8.4",
    "src": "百炼同价",
    "desc": "低成本高吞吐"
  },
  {
    "name": "GLM-5.3",
    "type": "通用均衡",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "智能体",
      "长上下文"
    ],
    "context": "200K",
    "perToken": "¥8/¥28",
    "src": "阿里百炼",
    "desc": "智谱新一代"
  }
  ],
  note: "“调用量”按 qwen3.6-plus 官方例子（单次 49,716 tokens ≈ 4 Credits，1 Credit ≈ 12,429 tokens）折算，实际受模型、思考开关、Harness 工具影响。另有 Coding Plan Pro ¥200/月（9万次请求/月，每日 9:30 限量抢购）。",
},
{
  name: "火山方舟·Coding Plan", kind: "套餐",
  plans: [
    { tier: "Lite", price: "¥40/月", feature: "刊例价；5小时约1,200次请求、月约18,000次；Doubao/DeepSeek/GLM/Kimi/MiniMax 8+款，支持 Auto 模式" },
    { tier: "Lite·活动价", price: "¥9.9/月（首两月）", feature: "2026/6/8–11/8 限时2.5折，受邀下单再9.5折，名额有限先到先得" },
    { tier: "Pro", price: "¥200/月", feature: "5× Lite 用量；5小时约6,000次、月约90,000次；额外解锁 ArkClaw 7×24 智能伙伴" },
    { tier: "Pro·活动价", price: "¥49.9/月（首两月）", feature: "限时2.5折，新购/升级/续费共享同一资格" },
    { tier: "注册赠送", price: "¥0", feature: "注册即领 2,500 万 Tokens" },
    ],
  models: [
  {
    "name": "豆包 Doubao Seed 2.0 Pro",
    "type": "通用均衡",
    "tags": [
      "纯文本",
      "多模态",
      "代码生成",
      "推理"
    ],
    "context": "128K",
    "perToken": "¥3.2/¥16",
    "src": "火山方舟",
    "desc": "豆包主力"
  },
  {
    "name": "豆包 Doubao Seed 2.1 Pro",
    "type": "通用旗舰",
    "tags": [
      "纯文本",
      "多模态",
      "代码生成",
      "推理",
      "智能体"
    ],
    "context": "128K",
    "perToken": "¥6/¥30",
    "src": "火山方舟",
    "desc": "豆包旗舰"
  },
  {
    "name": "DeepSeek-V4-Pro",
    "type": "通用均衡",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "1.0M",
    "perToken": "¥3/¥6",
    "src": "火山方舟",
    "desc": "深度求索旗舰"
  },
  {
    "name": "Kimi-K3",
    "type": "通用旗舰",
    "tags": [
      "纯文本",
      "多模态",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "100万",
    "perToken": "¥20/¥100",
    "src": "火山方舟",
    "desc": "Auto 夜间高比例路由"
  },
  {
    "name": "GLM-5.2",
    "type": "通用均衡",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "智能体"
    ],
    "context": "200K",
    "perToken": "¥9.25/¥28.85",
    "src": "火山方舟",
    "desc": "Agent 工具调用"
  },
  {
    "name": "MiniMax-M3",
    "type": "性价比",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "200K",
    "perToken": "¥2.1/¥8.4",
    "src": "火山方舟",
    "desc": "低成本高吞吐"
  },
  {
    "name": "Kimi-K2.7-Code",
    "type": "编程",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "智能体"
    ],
    "context": "262K",
    "perToken": "¥6.1/¥26.98",
    "src": "火山方舟",
    "desc": "编程专用"
  }
  ],
  note: "按请求数计费，无集分制。官方暂未公示单次请求平均 token 消耗；按官方档位价值推断给予按量官方价的“十折”优惠。简单问题单次 5–15 次模型调用，复杂 15–30+ 次。",
},
{
  name: "硅基流动 SiliconFlow", kind: "平台",
  plans: [
    { tier: "免费额度", price: "¥0", feature: "免费体验额度（文本/视觉/图像/视频），用尽后转按量" },
    { tier: "按量计费 Serverless", price: "约 ¥0.7–96 /百万token", feature: "统一 API 聚合 20+ 模型：DeepSeek-V4-Pro/V3.2、Qwen3.8-Max、Kimi-K3/K2.7-Code、GLM-5.2、MiniMax、腾讯 Hy3 等" },
    { tier: "缓存命中", price: "低至输入价的 1/7", feature: "如 DeepSeek-V4-Pro 缓存命中 ¥0.1/百万token" },
    { tier: "企业版", price: "定制报价", feature: "专属容量与限流、SLA 支持、优先访问新模型" },
    ],
  note: "本表内 4 款模型采其在售价：DeepSeek-V3.2 ¥4/¥6、混元 Hy3 ¥0.94/¥3.75、Kimi-K2.7-Code ¥6.1/¥26.98、LongCat-2.0 ¥5.33/¥20.95。表外在售价：DeepSeek-V4-Pro ¥12/¥24、Qwen3.6-27B ¥3/¥18、Qwen3.6-35B-A3B ¥1.8/¥10.8、Nex-N2-Pro ¥1.75/¥7、GLM-5.2 ¥9.25/¥28.85。",
},
{
  name: "百度千帆·Coding Plan", kind: "套餐",
  plans: [
    { tier: "Lite", price: "¥40/月", feature: "1.8万次请求/月，支持文心/DeepSeek/MiniMax 等 5 款" },
    { tier: "Pro", price: "¥200/月", feature: "9万次请求/月" },
    ],
  models: [
  {
    "name": "文心 ERNIE 4.5 Turbo",
    "type": "性价比",
    "tags": [
      "纯文本",
      "代码生成",
      "长上下文"
    ],
    "context": "128K",
    "perToken": "¥0.8/¥3.2",
    "src": "百度千帆",
    "desc": "深度绑定搜索知识库"
  },
  {
    "name": "DeepSeek-V4-Flash",
    "type": "性价比",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "1.0M",
    "perToken": "¥1/¥2",
    "src": "千帆",
    "desc": "国产低价主力"
  },
  {
    "name": "MiniMax-M2.7",
    "type": "性价比",
    "tags": [
      "纯文本",
      "代码生成",
      "推理"
    ],
    "context": "200K",
    "perToken": "≈¥2.1/¥8.4",
    "src": "千帆",
    "desc": "低成本高吞吐"
  }
  ],
  note: "按请求数计费，具体支持模型以官方页为准。千帆一千人额度为“1万次请求/月”基线，无官方公开的 token 消耗参考。",
},
{
  name: "MiniMax Token Plan", kind: "套餐",
  plans: [
    { tier: "入门", price: "¥29/月", feature: "最低档，仅支持 MiniMax-M2.7 一款模型" },
    { tier: "进阶", price: "¥49/月", feature: "更大文本额度（约 6 亿 Tokens 池）" },
    { tier: "高阶", price: "¥98、¥119/月", feature: "更高额度，解锁多模态输出形式" },
    { tier: "专业", price: "¥199/月", feature: "文本/图片/视频/音频多形式输出分别限额" },
    { tier: "旗舰", price: "¥899/月", feature: "最高档，MiniMax 系列多模态 6 款模型" },
    ],
  models: [
  {
    "name": "MiniMax-M2.7",
    "type": "性价比",
    "tags": [
      "纯文本",
      "代码生成",
      "推理"
    ],
    "context": "200K",
    "perToken": "≈¥2.1/¥8.4",
    "src": "硅基流动（M2.5口径）",
    "desc": "本套餐唯一支持模型"
  },
  {
    "name": "MiniMax-M3",
    "type": "性价比",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "200K",
    "perToken": "¥2.1/¥8.4",
    "src": "阿里百炼",
    "desc": "高额额内展开模型"
  },
  {
    "name": "矩构多模态生成平台",
    "type": "多模态",
    "tags": [
      "多模态"
    ],
    "context": "—",
    "perToken": "—",
    "src": "矩构官方",
    "desc": "高阶及以上展开多形式输出"
  }
  ],
  note: "非统一 token 池，文本/图片/视频/音频分别限额。Starter/Plus/Max 封额 600/1,500/4,500 次 5 小时。无官方折算口径，本表按官方测试数据候选：“Starter ≈ 2亿 tokens/月”。",
},
{
  name: "小米 MiMo Token Plan", kind: "套餐",
  plans: [
    { tier: "Lite", price: "¥39/月", feature: "6,000万 Credits/月" },
    { tier: "Standard", price: "¥99/月", feature: "2亿 Credits/月" },
    { tier: "Pro", price: "¥329/月", feature: "7亿 Credits/月" },
    { tier: "Max", price: "¥659/月", feature: "16亿 Credits/月" },
    ],
  models: [
  {
    "name": "MiMo-V2-Omni",
    "type": "多模态",
    "tags": [
      "多模态",
      "语音",
      "实时"
    ],
    "context": "256K",
    "perToken": "1x（1 Token=1 Credit）",
    "src": "小米官方",
    "desc": "全模态，消耗倍率最低"
  },
  {
    "name": "MiMo-V2-Pro",
    "type": "通用均衡",
    "tags": [
      "纯文本",
      "代码生成",
      "推理"
    ],
    "context": "256K / 1M",
    "perToken": "2x / 4x（按上下文）",
    "src": "小米官方",
    "desc": "文本主力，1M 上下文时消耗 4 Credit/token"
  }
  ],
  note: "统一 Credit 点数体系。倍率：Omni 1x（1 Token = 1 Credit）；Pro 256K 上下文 2x；Pro 256K–1M 4x。其他新旧变化：官方早期宣布 Lite 仅 6,000万 Credits，现官方定价页为 4.1B Credits（2026-05-26 后优化推理后提升）。夜间 00:00–08:00 消耗 0.8x。",
},
{
  name: "移动云·大模型 Coding Plan", kind: "套餐",
  plans: [
    { tier: "基础", price: "¥40/月", feature: "1.8万次请求/月，暂仅支持 MiniMax 系列 1 款" },
    { tier: "专业", price: "¥200/月", feature: "9万次请求/月" },
    { tier: "江苏移动算力包", price: "¥10/¥20/¥40/¥40 每月", feature: "含 250万/1000万/2000万 Tokens 或 1.8万次请求，最多支持千问/DeepSeek/MiniMax/Kimi 等 15 款" },
    ],
  models: [
  {
    "name": "MiniMax-M2.7",
    "type": "性价比",
    "tags": [
      "纯文本",
      "代码生成",
      "推理"
    ],
    "context": "200K",
    "perToken": "≈¥2.1/¥8.4",
    "src": "移动云",
    "desc": "基础/专业档主推"
  },
  {
    "name": "Qwen3.8-Flash",
    "type": "性价比",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "1.0M",
    "perToken": "¥0.8/¥2.7",
    "src": "移动云",
    "desc": "百万 token 成本不足 1 元"
  },
  {
    "name": "DeepSeek-V4-Pro",
    "type": "通用均衡",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "长上下文"
    ],
    "context": "1.0M",
    "perToken": "¥3/¥6",
    "src": "移动云",
    "desc": "旗舰性价比"
  },
  {
    "name": "Kimi-K2.7-Code",
    "type": "编程",
    "tags": [
      "纯文本",
      "代码生成",
      "推理",
      "智能体"
    ],
    "context": "262K",
    "perToken": "¥6.1/¥26.98",
    "src": "移动云",
    "desc": "编程专用"
  }
  ],
  note: "运营商云方案；陕江移动算力包支持 15 款模型，无官方公开单次 token 消耗折算比例，本表定价据估算参考。",
},
{
  name: "GitHub Copilot（微软）", kind: "订阅",
  plans: [
    { tier: "Copilot Pro", price: "¥71/月", feature: "代码补全+AI编程（$10，年付$100）" },
    { tier: "Pro+", price: "¥277/月", feature: "更高额度（$39）" },
    { tier: "Max", price: "¥710/月", feature: "最高档，重度Agent（$100）" },
    { tier: "企业版", price: "¥277/席/月", feature: "GitHub 深度集成（$39）" },
    ],
  note: "2026-06-01 起改为『基础月租 + 超额Token计费』，有开发者反映实际成本上涨数十倍；核心代码补全功能不计入额度。",
},
{
  name: "Cursor", kind: "订阅",
  plans: [
    { tier: "Hobby", price: "¥0", feature: "免费试用" },
    { tier: "Pro", price: "¥142/月", feature: "含约¥142 API agent用量，Auto/Composer（$20）" },
    { tier: "Pro+", price: "¥426/月", feature: "更高Agent用量（$60）" },
    { tier: "Ultra", price: "¥1420/月", feature: "重度多Agent并行（$200）" },
    { tier: "Teams", price: "¥284/席/月", feature: "团队管理（$40）" },
    ],
  note: "IDE型AI编程Agent，后续档位按API Token用量阶梯计价；国内可直连。",
},
{
  name: "Windsurf", kind: "订阅",
  plans: [
    { tier: "Free", price: "¥0", feature: "25积分/月" },
    { tier: "Pro", price: "¥142/月", feature: "无限SWE-1.5模型 + 前沿模型额度（$20）" },
    { tier: "Teams", price: "¥213/席/月", feature: "团队协作（$30）" },
    ],
  note: "Cognition 出品的类Cursor AI IDE。",
},
{
  name: "Kimi Code（月之暗面）", kind: "订阅",
  plans: [
    { tier: "Free", price: "¥0", feature: "基础额度" },
    { tier: "Kimi Code", price: "¥135/月", feature: "编程Agent，兼容 Claude Code/Cline（$19）" },
    ],
  note: "面向AI编程，走 Kimi K3/K2.8 模型；年度订阅有折扣。",
},
{
  name: "GLM Coding Plan（智谱）", kind: "订阅",
  plans: [
    { tier: "Lite", price: "¥128/月", feature: "兼容 Claude Code/Cline/OpenCode（$18）" },
    { tier: "Pro / Max", price: "更高档", feature: "更高额度与模型" },
    ],
  note: "智谱官方AI编程套餐，是国内最早开放第三方 Agent 接入的国产方案之一。",
},
{
  name: "Qwen Code（阿里）", kind: "订阅",
  plans: [
    { tier: "Pro", price: "¥355/月", feature: "含1000次免费OAuth调用/天（$50）" },
    { tier: "Lite", price: "已关闭新订阅", feature: "2026-03-20 起不再接收新订阅" },
    ],
  note: "阿里官方AI编程套餐，走 Qwen3.8 家族。",
},
{
  name: "WorkBuddy（国内办公Agent）", kind: "订阅",
  plans: [
    { tier: "标准版", price: "¥70/月（连续包月）", feature: "轻量办公Agent；¥99 单月" },
    { tier: "高级版", price: "¥140/月", feature: "更强Agent能力与更高额度" },
    { tier: "旗舰版", price: "¥700/月", feature: "重度多任务与最高额度" },
    ],
  note: "国内办公Agent，已接入腾讯混元 Hy4 preview 等国产模型。",
},
{
  name: "通义灵码（阿里）", kind: "订阅",
  plans: [
    { tier: "个人版", price: "¥0", feature: "完全免费" },
    { tier: "企业标准", price: "¥79/人/月", feature: "企业知识管理" },
    { tier: "企业专属", price: "¥159/人/月", feature: "VPC部署等（最低100席）" },
    ],
  note: "国内主流免费AI编程工具之一，个人版零成本。",
},
{
  name: "Trae（字节跳动）", kind: "订阅",
  plans: [
    { tier: "个人版", price: "¥0", feature: "含 Claude 额度" },
    { tier: "企业版", price: "¥199/席/月", feature: "企业级安全合规" },
    ],
  note: "字节IDE型编程工具，个人版完全免费且含海外模型额度。",
},
{
  name: "CodeBuddy（腾讯）", kind: "订阅",
  plans: [
    { tier: "个人版", price: "¥0（每日限量）", feature: "超额度受限" },
    { tier: "企业版", price: "¥78/人/月", feature: "微信生态+等保三级，已接入混元 Hy4" },
    ],
  note: "腾讯AI编程/Agent，深度接入混元。",
},
{
  name: "豆包（字节C端）", kind: "订阅",
  plans: [
    { tier: "免费版", price: "¥0", feature: "基础对话" },
    { tier: "专业版", price: "¥68/月", feature: "增强模型+更高额度" },
    ],
  note: "字节C端通用助手App订阅。",
},
{
  name: "微软 365 Copilot", kind: "订阅",
  plans: [
    { tier: "Copilot Pro", price: "¥142/月", feature: "Copilot Pro 应用（$20）" },
    { tier: "企业版", price: "¥213/用户/月", feature: "企业办公，深度集成 M365（$30，需M365许可）" },
    ],
  note: "企业办公场景，需先有 Microsoft 365 许可；主要面向Office文档与工作流自动化。",
},
];

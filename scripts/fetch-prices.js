#!/usr/bin/env node
/**
 * 每日自动更新模型价格
 * ============================================================
 * 流程：
 *   1. 读取 data.js（保留原格式与注释）
 *   2. 遍历各数据源，抓取最新价格
 *   3. 就地修补 inputPm / outputPm / updated 字段（不重写整个数组）
 *   4. 修补后做语法自检，通过才落盘
 *   5. 同步写入 deploy/data.js（Cloudflare Pages 部署根）
 *   6. 输出变更摘要（GitHub Actions 日志可见）
 * ============================================================
 *
 * 使用方式：
 *   node scripts/fetch-prices.js              # 正常更新
 *   node scripts/fetch-prices.js --dry-run    # 仅预览，不写入
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const { SOURCES } = require('./config');
const {
  parseDataJs, patchDataJs, patchDate, priceChanged, summarizeChanges,
} = require('./lib');

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = path.resolve(__dirname, '..');
const DATA_JS = path.join(ROOT, 'data.js');
const DEPLOY_DATA_JS = path.join(ROOT, 'deploy', 'data.js');
const FX = 7.10; // USD → CNY
const TODAY = new Date().toISOString().slice(0, 10);

/* ============================================================
 * 工具函数
 * ============================================================ */

/** 模型名称匹配：将源返回的模型名映射到 data.js 中的 short 字段 */
function matchModel(sourceName, modelShort, modelName) {
  const s = String(sourceName).toLowerCase().trim();
  const short = (modelShort || '').toLowerCase().trim();
  const name = (modelName || '').toLowerCase().trim();

  // 精确匹配
  if (s === short || s === name) return true;

  // 包含匹配（处理 "Claude Sonnet 4" vs "Claude Sonnet 4" 等情况）
  if (short.includes(s) || s.includes(short)) return true;
  if (name.includes(s) || s.includes(name)) return true;

  // 特殊映射表（处理命名不一致）
  const ALIAS = {
    'gpt-5.5': 'gpt-5.5', 'gpt-5.5-pro': 'gpt-5.5 pro',
    'claude-sonnet-4': 'claude sonnet 4',
    'deepseek-v4-flash': 'deepseek-v4-flash',
    'deepseek-v3.2': 'deepseek-v3.2',
    'gemini-3-pro': 'gemini 3 pro',
  };
  return ALIAS[s] === short || ALIAS[short] === s;
}

/** 根据模型的 vendorTag 找到对应的数据源 */
function findSource(model) {
  const tag = model.vendorTag || '';
  return SOURCES.find(s => s.name === tag) ||
         SOURCES.find(s => s.name && tag.includes(s.name));
}

/* ============================================================
 * 主流程
 * ============================================================ */
async function main() {
  console.log('=== AI 模型价格自动更新 ===');
  console.log(`模式: ${DRY_RUN ? '🔍 Dry Run（仅预览）' : '📝 正常更新'}`);
  console.log(`汇率: USD→CNY 1:${FX}`);
  console.log(`日期: ${TODAY}`);
  console.log('');

  // 1) 读取当前数据
  const content = fs.readFileSync(DATA_JS, 'utf-8');
  const { MODELS, SUBSCRIPTIONS } = parseDataJs(content);
  console.log(`📄 读取 data.js: ${MODELS.length} 款模型, ${SUBSCRIPTIONS.length} 组订阅`);
  console.log('');

  // 2) 逐源抓取
  const changes = [];
  const changedModels = new Set();
  const unmatched = [];
  const failedSources = [];
  let priceUpdateCount = 0;

  for (const source of SOURCES) {
    console.log(`🔄 抓取 [${source.name}]...`);
    try {
      const result = await source.fetch.call(source);
      if (!result || typeof result !== 'object') {
        console.log(`  ⏭ 跳过（无数据）`);
        continue;
      }

      let sourceUpdates = 0;
      for (const [sourceModelName, priceInfo] of Object.entries(result)) {
        // 在 MODELS 中找到匹配的模型
        const model = MODELS.find(m => matchModel(sourceModelName, m.short, m.name));
        if (!model) {
          // 未匹配到模型，记录（可能是新模型，需人工确认后补进总表）
          unmatched.push(`${sourceModelName}  ←  ${source.name}`);
          continue;
        }

        const newInput = priceInfo.input ? parseFloat(priceInfo.input) : null;
        const newOutput = priceInfo.output ? parseFloat(priceInfo.output) : null;
        let changed = false;

        // 注意：oldVal 必须在赋值前取，否则日志会显示 "¥1.42 → ¥1.42"
        if (newInput && priceChanged(model.inputPm, newInput)) {
          changes.push({
            model: model.short,
            field: 'inputPm',
            oldVal: model.inputPm,
            newVal: newInput,
            source: source.name,
          });
          changed = true;
        }

        if (newOutput && priceChanged(model.outputPm, newOutput)) {
          changes.push({
            model: model.short,
            field: 'outputPm',
            oldVal: model.outputPm,
            newVal: newOutput,
            source: source.name,
          });
          changed = true;
        }

        if (changed) {
          changedModels.add(model.short);
          sourceUpdates++;
        }
      }

      console.log(`  ✅ 完成，更新 ${sourceUpdates} 款`);
      priceUpdateCount += sourceUpdates;

    } catch (err) {
      console.log(`  ❌ 失败: ${err.message}`);
      failedSources.push({ source: source.name, error: err.message });
    }
  }

  // 3) 为有变更的模型补上 updated 字段（记录本次更新时间）
  for (const short of changedModels) {
    changes.push({ model: short, field: 'updated', newVal: TODAY, oldVal: '', source: 'auto' });
  }

  // 4) 输出摘要
  console.log('');
  console.log('=== 更新摘要 ===');
  console.log(summarizeChanges(changes));

  if (unmatched.length) {
    console.log('');
    console.log(`ℹ ${unmatched.length} 个源侧模型名未匹配到总表条目（可能是新模型，需人工确认后补进总表）：`);
    for (const u of unmatched.slice(0, 30)) console.log(`  - ${u}`);
    if (unmatched.length > 30) console.log(`  ... 其余 ${unmatched.length - 30} 条已省略`);
  }

  if (failedSources.length) {
    console.log('');
    console.log(`⚠ ${failedSources.length} 个数据源抓取失败：`);
    for (const f of failedSources) {
      console.log(`  - ${f.source}: ${f.error}`);
    }
  }

  console.log('');
  console.log(`📊 共更新 ${priceUpdateCount} 款模型价格`);

  // 5) 落盘
  if (DRY_RUN) {
    console.log('🔍 Dry Run 模式，未写入文件。');
    return;
  }
  if (!priceUpdateCount) {
    console.log('✅ 无价格变更，未写入文件。');
    return;
  }

  const { content: patched, missed } = patchDataJs(content, changes);
  if (missed.length) {
    console.log('');
    console.log(`⚠ ${missed.length} 处字段未能定位（已跳过）：`);
    for (const mm of missed) console.log(`  - ${mm.model}.${mm.field}: ${mm.reason}`);
  }

  const dated = patchDate(patched, TODAY);

  // 语法自检：坏数据绝不推上线
  try {
    const check = parseDataJs(dated);
    if (!check.MODELS.length) throw new Error('MODELS 解析为空');
  } catch (e) {
    console.error(`❌ 修补后的 data.js 校验失败，已放弃写入：${e.message}`);
    process.exit(1);
  }

  fs.writeFileSync(DATA_JS, dated, 'utf-8');
  console.log(`💾 已写入 ${DATA_JS}`);

  // 同步到 Cloudflare Pages 部署根
  if (fs.existsSync(path.dirname(DEPLOY_DATA_JS))) {
    fs.writeFileSync(DEPLOY_DATA_JS, dated, 'utf-8');
    console.log(`💾 已同步 ${DEPLOY_DATA_JS}`);
  }
}

main().catch(err => {
  console.error('❌ 致命错误:', err);
  process.exit(1);
});

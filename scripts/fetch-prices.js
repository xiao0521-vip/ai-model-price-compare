#!/usr/bin/env node
/**
 * 每日自动更新模型价格
 * ============================================================
 * 流程：
 *   1. 读取 data.js
 *   2. 遍历各数据源，抓取最新价格
 *   3. 对比并更新 data.js 中的 inputPm / outputPm / updated 字段
 *   4. 输出变更摘要（GitHub Actions 日志可见）
 *   5. 如有变更则写入文件（CI 中 git commit 由 Action 自动完成）
 * ============================================================
 *
 * 使用方式：
 *   node scripts/fetch-prices.js              # 正常更新
 *   node scripts/fetch-prices.js --dry-run    # 仅预览，不写入
 * ============================================================
 */

const path = require('path');
const { SOURCES } = require('./config');
const {
  parseDataJs, writeDataJs, priceChanged, summarizeChanges,
} = require('./lib');

const DRY_RUN = process.argv.includes('--dry-run');
const DATA_JS = path.resolve(__dirname, '..', 'data.js');
const FX = 7.10; // USD → CNY

/* ============================================================
 * 工具函数
 * ============================================================ */

/** 模型名称匹配：将源返回的模型名映射到 data.js 中的 short 字段 */
function matchModel(sourceName, modelShort, modelName) {
  const s = sourceName.toLowerCase().trim();
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
  console.log('');

  // 1) 读取当前数据
  const content = require('fs').readFileSync(DATA_JS, 'utf-8');
  const { MODELS, SUBSCRIPTIONS } = parseDataJs(content);
  console.log(`📄 读取 data.js: ${MODELS.length} 款模型, ${SUBSCRIPTIONS.length} 组订阅`);
  console.log('');

  // 2) 并发抓取各数据源
  const changes = [];
  const failedSources = [];
  let updatedCount = 0;

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
          // 未匹配到模型，跳过（可能是新模型，需手动添加）
          continue;
        }

        // 检查价格是否需要更新
        const newInput = priceInfo.input ? parseFloat(priceInfo.input).toFixed(2) : null;
        const newOutput = priceInfo.output ? parseFloat(priceInfo.output).toFixed(2) : null;

        let changed = false;

        if (newInput && priceChanged(model.inputPm, newInput)) {
          if (!DRY_RUN) model.inputPm = parseFloat(newInput);
          changes.push({
            model: model.short,
            field: 'input',
            oldVal: model.inputPm,
            newVal: newInput,
            source: source.name,
          });
          changed = true;
        }

        if (newOutput && priceChanged(model.outputPm, newOutput)) {
          if (!DRY_RUN) model.outputPm = parseFloat(newOutput);
          changes.push({
            model: model.short,
            field: 'output',
            oldVal: model.outputPm,
            newVal: newOutput,
            source: source.name,
          });
          changed = true;
        }

        if (changed) {
          if (!DRY_RUN) model.updated = new Date().toISOString().slice(0, 10);
          sourceUpdates++;
        }
      }

      console.log(`  ✅ 完成，更新 ${sourceUpdates} 款`);
      updatedCount += sourceUpdates;

    } catch (err) {
      console.log(`  ❌ 失败: ${err.message}`);
      failedSources.push({ source: source.name, error: err.message });
    }
  }

  // 3) 输出摘要
  console.log('');
  console.log('=== 更新摘要 ===');
  if (changes.length === 0) {
    console.log('✅ 所有价格无变化，无需更新。');
  } else {
    console.log(summarizeChanges(changes));
  }

  if (failedSources.length) {
    console.log('');
    console.log(`⚠ ${failedSources.length} 个数据源抓取失败：`);
    for (const f of failedSources) {
      console.log(`  - ${f.source}: ${f.error}`);
    }
  }

  console.log('');
  console.log(`📊 共更新 ${updatedCount} 款模型价格`);

  // 4) 写入文件
  if (!DRY_RUN && changes.length > 0) {
    writeDataJs(DATA_JS, content, MODELS, SUBSCRIPTIONS);
    console.log(`💾 已写入 ${DATA_JS}`);
  } else if (DRY_RUN) {
    console.log('🔍 Dry Run 模式，未写入文件。');
  } else {
    console.log('✅ 无变更，未写入文件。');
  }

  // 5) 退出码：有变更时返回 1（触发 PR 创建）
  process.exit(changes.length > 0 ? 0 : 0);
}

main().catch(err => {
  console.error('❌ 致命错误:', err);
  process.exit(1);
});

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
  SANITY, parseDataJs, patchDataJs, patchDate, judgePrice, priceChanged,
  summarizeChanges, matchModel,
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

/* matchModel / isNoiseName 已移入 lib.js（第 11、12 节），便于单测。
 * 严格前缀匹配 + 噪声过滤，杜绝 "2.0" 命中 "美团 LongCat 2.0" 这类误配。 */

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
  const ambiguous = [];    // 源名同时命中多款模型，判为歧义并丢弃
  const failedSources = [];
  const suspects = [];    // 被判定为单位/解析错误而丢弃的价格
  const softWarns = [];   // 波动较大但照常更新的价格
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
        // 在 MODELS 中定位模型：要求「唯一命中」。
        // 宁可漏更新，也不可把价格写进配错的模型。
        const matches = MODELS.filter(m => matchModel(sourceModelName, m.short, m.name));
        if (matches.length !== 1) {
          if (matches.length > 1) {
            ambiguous.push(
              `"${sourceModelName}"（${source.name}）同时命中 ${matches.length} 款：` +
              matches.map(m => m.short).join(' / ')
            );
          } else {
            // 未匹配到模型，记录（可能是新模型，需人工确认后补进总表）
            unmatched.push(`"${sourceModelName}"  ←  ${source.name}`);
          }
          continue;
        }
        const model = matches[0];

        const candidates = [
          { field: 'inputPm', oldVal: model.inputPm, raw: priceInfo.input },
          { field: 'outputPm', oldVal: model.outputPm, raw: priceInfo.output },
        ];
        let changed = false;

        for (const c of candidates) {
          if (!c.raw) continue;
          const newVal = parseFloat(c.raw);
          // 注意：oldVal 来自 data.js 现值（不是刚被改写过的值）
          if (!priceChanged(c.oldVal, newVal)) continue;

          // ★ 单位 / 解析错误在这里就被拦下，绝不进 data.js
          const verdict = judgePrice(c.oldVal, newVal);
          if (verdict.action === 'reject') {
            suspects.push({
              source: source.name, model: model.short, field: c.field,
              oldVal: c.oldVal, newVal, reason: verdict.reason,
            });
            continue;
          }
          if (verdict.action === 'warn') {
            softWarns.push(`[${source.name}] ${model.short} ${c.field}: ¥${c.oldVal} → ¥${newVal}（${verdict.reason}）`);
          }

          changes.push({
            model: model.short,
            field: c.field,
            oldVal: c.oldVal,
            newVal,
            source: source.name,
            matchedKey: String(sourceModelName),   // 留痕：出问题时能追到源侧原始名字
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

  if (ambiguous.length) {
    console.log('');
    console.log(`⚠ ${ambiguous.length} 个源名同时命中多款模型，为避免配错型号已全部丢弃：`);
    for (const a of ambiguous.slice(0, 20)) console.log(`  - ${a}`);
    if (ambiguous.length > 20) console.log(`  ... 其余 ${ambiguous.length - 20} 条已省略`);
    console.log('  ℹ 这是刻意的设计：宁可漏更新，不可把价格写进配错的模型。');
  }

  if (suspects.length) {
    console.log('');
    console.log(`🚫 ${suspects.length} 处价格被判定为「单位换算 / 解析错误」，已丢弃未写入：`);
    for (const s of suspects.slice(0, 20)) {
      console.log(`  - [${s.source}] ${s.model} ${s.field}: ¥${s.oldVal} → ¥${s.newVal}（${s.reason}）`);
    }
    if (suspects.length > 20) console.log(`  ... 其余 ${suspects.length - 20} 条已省略`);
    console.log(`  ℹ 这些源的解析器口径需要校准；校准前该源不会产生任何更新（宁可漏更新，不可写错价）。`);

    // 同一个源只报一次，避免刷屏；GitHub 会把 ::warning:: 渲染成运行页上的告警标记
    for (const src of [...new Set(suspects.map(s => s.source))]) {
      console.log(`::warning title=解析器口径待校准::${src} 产出的价格疑似单位换算错误，本次已丢弃。请检查 scripts/config.js 中该源的 quotePer 设置。`);
    }
  }

  if (softWarns.length) {
    console.log('');
    console.log(`⚠ ${softWarns.length} 处价格波动较大（已照常更新，请留意是否真实降价）：`);
    for (const w of softWarns.slice(0, 20)) console.log(`  - ${w}`);
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

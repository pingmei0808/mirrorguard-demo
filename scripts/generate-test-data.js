#!/usr/bin/env node
/** 生成模拟面瘫测试数据集 - 用于快速准召率测试 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './datasets/synthetic-facial-palsy';
const NUM_SAMPLES = 100;

// 面瘫症状模拟参数
const PALSY_LEVELS = {
  normal: { mouth_drop: 0, eye_droop: 0, nasolabial: 0 },
  mild: { mouth_drop: 0.1, eye_droop: 0.08, nasolabial: 0.12 },
  moderate: { mouth_drop: 0.2, eye_droop: 0.15, nasolabial: 0.25 },
  severe: { mouth_drop: 0.35, eye_droop: 0.28, nasolabial: 0.4 }
};

console.log('🚀 生成模拟面瘫测试数据集...\n');

// 创建目录
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, 'images'), { recursive: true });
}

// 生成标注
const annotations = [];

for (let i = 0; i < NUM_SAMPLES; i++) {
  // 随机分配严重程度
  const rand = Math.random();
  let severity, label;
  if (rand < 0.4) {
    severity = 'normal';
    label = 'low';
  } else if (rand < 0.6) {
    severity = 'mild';
    label = 'medium';
  } else if (rand < 0.8) {
    severity = 'moderate';
    label = 'medium';
  } else {
    severity = 'severe';
    label = 'high';
  }
  
  // 随机年龄和性别
  const age = Math.floor(Math.random() * 50) + 30; // 30-80 岁
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const hasHistory = Math.random() > 0.7;
  
  annotations.push({
    filename: `images/synthetic_${String(i+1).padStart(3, '0')}.jpg`,
    label,
    severity: severity,
    simulated_symptoms: PALSY_LEVELS[severity],
    patientInfo: { age, gender, hasHistory }
  });
}

// 保存标注
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'annotations.json'),
  JSON.stringify(annotations, null, 2)
);

// 统计
const stats = {
  total: NUM_SAMPLES,
  low: annotations.filter(a => a.label === 'low').length,
  medium: annotations.filter(a => a.label === 'medium').length,
  high: annotations.filter(a => a.label === 'high').length
};

console.log('✅ 数据集生成完成！');
console.log(`\n📊 数据集统计:`);
console.log(`   总样本数：${stats.total}`);
console.log(`   Low (正常): ${stats.low} (${(stats.low/stats.total*100).toFixed(0)}%)`);
console.log(`   Medium (轻度/中度): ${stats.medium} (${(stats.medium/stats.total*100).toFixed(0)}%)`);
console.log(`   High (重度): ${stats.high} (${(stats.high/stats.total*100).toFixed(0)}%)`);
console.log(`\n📁 输出目录：${OUTPUT_DIR}`);
console.log(`\n⚠️  注意：这是模拟数据集，用于快速测试流程`);
console.log(`   真实准召率需要用临床数据集验证\n`);


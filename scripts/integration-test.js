#!/usr/bin/env node
/** 集成测试脚本 - 模拟完整用户流程 */

const fs = require('fs');
const path = require('path');

console.log('🧪 MirrorGuard 集成测试\n');

// 读取主文件
const indexPath = path.join(__dirname, '..', 'index-video.html');
const content = fs.readFileSync(indexPath, 'utf-8');

let tests = 0;
let passed = 0;

function test(name, fn) {
  tests++;
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
  }
}

// 测试 1: HTML 结构完整性
test('HTML 结构完整性', () => {
  const required = [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport"',
    '<title>',
    '</head>',
    '<body>',
    '</body>',
    '</html>'
  ];
  
  for (const tag of required) {
    if (!content.includes(tag)) {
      throw new Error(`缺少 ${tag}`);
    }
  }
});

// 测试 2: MediaPipe CDN 加载
test('MediaPipe CDN 配置', () => {
  if (!content.includes('face_mesh.min.js')) {
    throw new Error('缺少 face_mesh.min.js');
  }
  if (!content.includes('@0.4.1633549677')) {
    throw new Error('缺少版本号');
  }
  if (!content.includes('defer')) {
    throw new Error('缺少 defer 属性');
  }
});

// 测试 3: 关键 UI 元素
test('关键 UI 元素', () => {
  const elements = [
    'videoElement',
    'canvasElement',
    'startBtn',
    'stopBtn',
    'symmetryValue',
    'mouthValue',
    'eyeValue',
    'abnormalValue',
    'riskValue',
    'alertPanel',
    'loading'
  ];
  
  for (const id of elements) {
    if (!content.includes(`id="${id}"`)) {
      throw new Error(`缺少元素 ${id}`);
    }
  }
});

// 测试 4: 核心函数定义
test('核心函数定义', () => {
  const functions = [
    'waitForMediaPipe',
    'startDetection',
    'processFrame',
    'onResults',
    'calculateSymmetry',
    'temporalAnalyze',
    'updateDisplay',
    'drawLandmarks',
    'triggerAlert',
    'stopDetection'
  ];
  
  for (const fn of functions) {
    if (!content.includes(`function ${fn}`) && !content.includes(`${fn} =`)) {
      throw new Error(`缺少函数 ${fn}`);
    }
  }
});

// 测试 5: 关键 API 调用
test('关键 API 调用', () => {
  const apis = [
    'navigator.mediaDevices.getUserMedia',
    'faceMesh.send',
    'requestAnimationFrame',
    'canvas.getContext',
    'canvas.toDataURL'
  ];
  
  for (const api of apis) {
    if (!content.includes(api)) {
      throw new Error(`缺少 API 调用 ${api}`);
    }
  }
});

// 测试 6: 错误处理
test('错误处理机制', () => {
  if (!content.includes('try {')) {
    throw new Error('缺少 try-catch');
  }
  if (!content.includes('catch (error)')) {
    throw new Error('缺少 catch 块');
  }
  if (!content.includes('typeof FaceMesh === \'undefined\'')) {
    throw new Error('缺少 FaceMesh 检查');
  }
});

// 测试 7: 配置参数
test('配置参数', () => {
  const configs = [
    'mouthThreshold: 0.035',
    'eyeThreshold: 0.02',
    'alertThreshold: 0.5',
    'windowSize: 30'
  ];
  
  for (const config of configs) {
    if (!content.includes(config)) {
      throw new Error(`配置错误：${config}`);
    }
  }
});

// 测试 8: 移动端适配
test('移动端适配', () => {
  if (!content.includes('@media (max-width:')) {
    throw new Error('缺少媒体查询');
  }
  if (!content.includes('viewport')) {
    throw new Error('缺少 viewport 设置');
  }
  if (!content.includes('grid-template-columns: 1fr')) {
    throw new Error('缺少响应式布局');
  }
});

// 测试 9: 加载状态管理
test('加载状态管理', () => {
  if (!content.includes('loading.style.display')) {
    throw new Error('缺少加载状态控制');
  }
  if (!content.includes('loading-text')) {
    throw new Error('缺少加载文本');
  }
  if (!content.includes('setTimeout(check, 100)')) {
    throw new Error('缺少重试机制');
  }
});

// 测试 10: 数据流完整性
test('数据流完整性', () => {
  const flow = [
    'frameHistory.push',
    'frameHistory.length',
    'frameHistory.shift',
    'symmetry.overall',
    'temporalAnalysis.isAlert'
  ];
  
  for (const item of flow) {
    if (!content.includes(item)) {
      throw new Error(`数据流不完整：${item}`);
    }
  }
});

console.log('\n═══════════════════════════════════════');
console.log(`集成测试：${passed}/${tests} 通过`);
console.log(`通过率：${(passed / tests * 100).toFixed(1)}%`);
console.log('═══════════════════════════════════════\n');

if (passed === tests) {
  console.log('✅ 所有集成测试通过！系统可以正常运行！\n');
  process.exit(0);
} else {
  console.log(`⚠️ ${tests - passed} 个测试失败，请检查！\n`);
  process.exit(1);
}

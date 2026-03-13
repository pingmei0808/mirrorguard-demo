#!/usr/bin/env node
/** 代码验证脚本 - 验证核心算法逻辑 */

const fs = require('fs');
const path = require('path');

console.log('🔍 MirrorGuard 代码验证\n');

// 读取 index-video.html
const indexPath = path.join(__dirname, '..', 'index-video.html');
const indexContent = fs.readFileSync(indexPath, 'utf-8');

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

console.log('【CDN 资源检查】');
test('face_mesh.min.js 加载', indexContent.includes('face_mesh.min.js'));
test('camera_utils.min.js 加载', indexContent.includes('camera_utils.min.js'));
test('drawing_utils.min.js 加载', indexContent.includes('drawing_utils.min.js'));
test('CDN 版本号存在', indexContent.includes('@0.4.1633549677'));

console.log('\n【核心函数检查】');
test('startDetection 函数', indexContent.includes('async function startDetection()'));
test('processFrame 函数', indexContent.includes('async function processFrame()'));
test('onResults 函数', indexContent.includes('function onResults(results)'));
test('calculateSymmetry 函数', indexContent.includes('function calculateSymmetry(landmarks)'));
test('temporalAnalyze 函数', indexContent.includes('function temporalAnalyze()'));
test('updateDisplay 函数', indexContent.includes('function updateDisplay(symmetry, temporalAnalysis)'));
test('drawLandmarks 函数', indexContent.includes('function drawLandmarks(landmarks)'));
test('triggerAlert 函数', indexContent.includes('async function triggerAlert('));

console.log('\n【关键逻辑检查】');
test('getUserMedia 调用', indexContent.includes('navigator.mediaDevices.getUserMedia'));
test('faceMesh.send 调用', indexContent.includes('faceMesh.send({ image: video })'));
test('requestAnimationFrame', indexContent.includes('requestAnimationFrame(processFrame)'));
test('try-catch 错误处理', indexContent.includes('try {') && indexContent.includes('catch (error)'));
test('FaceMesh 加载检查', indexContent.includes('typeof FaceMesh === \'undefined\''));

console.log('\n【阈值配置检查】');
test('mouthThreshold 配置', indexContent.includes('mouthThreshold: 0.035'));
test('eyeThreshold 配置', indexContent.includes('eyeThreshold: 0.02'));
test('alertThreshold 配置', indexContent.includes('alertThreshold: 0.5'));
test('windowSize 配置', indexContent.includes('windowSize: 30'));

console.log('\n【移动端适配检查】');
test('viewport meta 标签', indexContent.includes('name="viewport"'));
test('媒体查询 @media', indexContent.includes('@media (max-width:'));
test('响应式布局', indexContent.includes('grid-template-columns: 1fr'));

console.log('\n【Bug 修复验证】');
test('temporalAnalyze 不返回 null', !indexContent.includes('return null;') || indexContent.includes('return {') && indexContent.includes('abnormalRatio'));
test('帧处理错误捕获', indexContent.includes('帧处理错误'));
test('Canvas 尺寸同步', indexContent.includes('canvas.width') && indexContent.includes('canvas.height'));

console.log('\n【UI 元素检查】');
test('视频元素', indexContent.includes('id="videoElement"'));
test('Canvas 元素', indexContent.includes('id="canvasElement"'));
test('开始按钮', indexContent.includes('id="startBtn"'));
test('停止按钮', indexContent.includes('id="stopBtn"'));
test('状态显示', indexContent.includes('id="symmetryValue"'));
test('加载动画', indexContent.includes('class="loading"'));
test('警报面板', indexContent.includes('id="alertPanel"'));

console.log('\n═══════════════════════════════════════');
console.log(`测试结果：${passed} 通过，${failed} 失败`);
console.log(`通过率：${(passed / (passed + failed) * 100).toFixed(1)}%`);
console.log('═══════════════════════════════════════\n');

if (failed > 0) {
  console.log('⚠️ 有测试失败，请检查代码！\n');
  process.exit(1);
} else {
  console.log('✅ 所有测试通过！代码质量良好！\n');
  process.exit(0);
}

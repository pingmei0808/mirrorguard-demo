#!/usr/bin/env node
/** MirrorGuard 快速功能测试脚本 */

const fs = require('fs');
const path = require('path');

const API_URL = process.env.MIRRORGUARD_API_URL || 'https://mirrorguard-demo.vercel.app/api/analyze';
const API_KEY = process.env.ANTHROPIC_API_KEY || '';

async function quickTest() {
  console.log('🚀 MirrorGuard 快速功能测试\n');
  console.log(`API: ${API_URL}\n`);
  
  // 测试 1: 检查 API 可达性
  console.log('📡 测试 1: API 连接测试...');
  try {
    const pingRes = await fetch(API_URL, {
      method: 'OPTIONS',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ API 可达 (状态码：${pingRes.status})`);
  } catch (e) {
    console.log(`   ❌ API 不可达：${e.message}`);
    return;
  }
  
  // 测试 2: 使用示例图片测试（如果有）
  console.log('\n📷 测试 2: 图像分析测试...');
  
  const testImagesDir = './test-images';
  if (!fs.existsSync(testImagesDir)) {
    fs.mkdirSync(testImagesDir, { recursive: true });
    console.log(`   ℹ️  创建测试目录：${testImagesDir}`);
    console.log(`   📋 请放置 3-5 张测试图片到此目录`);
  }
  
  const images = fs.readdirSync(testImagesDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  
  if (images.length === 0) {
    console.log('   ⚠️  无测试图片，跳过图像分析测试');
    console.log('   📝 请添加图片后重新运行');
  } else {
    console.log(`   📊 发现 ${images.length} 张测试图片`);
    
    const results = [];
    for (const img of images.slice(0, 3)) { // 最多测试 3 张
      console.log(`   📷 测试：${img}...`);
      try {
        const imgPath = path.join(testImagesDir, img);
        const imgData = fs.readFileSync(imgPath);
        const base64 = imgData.toString('base64');
        
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
          },
          body: JSON.stringify({
            imageBase64: `data:image/jpeg;base64,${base64}`,
            patientInfo: { age: 60, gender: 'male', hasHistory: false }
          })
        });
        
        if (!res.ok) {
          const err = await res.text();
          console.log(`   ❌ 失败：${res.status} - ${err}`);
          results.push({ image: img, status: 'error', error: err });
        } else {
          const result = await res.json();
          console.log(`   ✅ 风险等级：${result.risk_level}, 置信度：${result.confidence}%`);
          results.push({ image: img, status: 'success', result });
        }
      } catch (e) {
        console.log(`   ❌ 错误：${e.message}`);
        results.push({ image: img, status: 'error', error: e.message });
      }
    }
    
    // 保存结果
    const report = {
      timestamp: new Date().toISOString(),
      apiUrl: API_URL,
      totalImages: images.length,
      testedImages: results.length,
      successCount: results.filter(r => r.status === 'success').length,
      results
    };
    
    fs.writeFileSync('./test-results/quick-test.json', JSON.stringify(report, null, 2));
    console.log('\n💾 结果已保存：test-results/quick-test.json');
  }
  
  console.log('\n✅ 快速测试完成！');
}

quickTest().catch(console.error);

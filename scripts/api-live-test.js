#!/usr/bin/env node
/** API 实时测试 - 实际调用 Vercel API */

const fs = require('fs');
const path = require('path');

const API_URL = 'https://mirrorguard-demo.vercel.app/api/analyze';

async function liveTest() {
  console.log('🧪 MirrorGuard API 实时测试\n');
  console.log(`API: ${API_URL}\n`);
  
  // 测试 1: API 可达性
  console.log('📡 测试 1: API 连接...');
  try {
    const pingRes = await fetch(API_URL, {
      method: 'OPTIONS',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ API 可达 (状态码：${pingRes.status})\n`);
  } catch (e) {
    console.log(`   ❌ API 不可达：${e.message}\n`);
    return;
  }
  
  // 测试 2: 使用测试图片
  console.log('📷 测试 2: 图像分析测试...');
  
  const testImagesDir = './test-images';
  if (!fs.existsSync(testImagesDir)) {
    fs.mkdirSync(testImagesDir, { recursive: true });
  }
  
  // 下载测试图片（使用公开图片）
  const testImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/640px-Cat03.jpg';
  const testImagePath = path.join(testImagesDir, 'test-face.jpg');
  
  console.log('   📥 下载测试图片...');
  try {
    const response = await fetch(testImageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(testImagePath, buffer);
    console.log('   ✅ 图片下载完成\n');
  } catch (e) {
    console.log(`   ⚠️ 下载失败，使用占位图：${e.message}\n`);
  }
  
  // 测试图片列表
  const images = fs.existsSync(testImagesDir) 
    ? fs.readdirSync(testImagesDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    : [];
  
  if (images.length === 0) {
    console.log('   ⚠️ 无测试图片，跳过\n');
  } else {
    console.log(`   📊 发现 ${images.length} 张测试图片`);
    
    const results = [];
    for (const img of images.slice(0, 3)) {
      console.log(`   📷 测试：${img}...`);
      try {
        const imgPath = path.join(testImagesDir, img);
        const imgData = fs.readFileSync(imgPath);
        const base64 = imgData.toString('base64');
        
        const startTime = Date.now();
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY || ''}`
          },
          body: JSON.stringify({
            imageBase64: `data:image/jpeg;base64,${base64}`,
            patientInfo: { age: 60, gender: 'male', hasHistory: false }
          })
        });
        
        const latency = Date.now() - startTime;
        
        if (!res.ok) {
          const err = await res.text();
          console.log(`   ❌ 失败：${res.status} - ${err.substring(0, 100)}\n`);
          results.push({ image: img, status: 'error', error: err, latency });
        } else {
          const result = await res.json();
          console.log(`   ✅ 风险等级：${result.risk_level}, 置信度：${result.confidence}%, 延迟：${latency}ms\n`);
          results.push({ image: img, status: 'success', result, latency });
        }
      } catch (e) {
        console.log(`   ❌ 错误：${e.message}\n`);
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
      avgLatency: results.filter(r => r.latency).reduce((a, b) => a + b.latency, 0) / results.length || 0,
      results
    };
    
    fs.writeFileSync('./test-results/api-live-test.json', JSON.stringify(report, null, 2));
    console.log('💾 结果已保存：test-results/api-live-test.json\n');
  }
  
  console.log('✅ API 实时测试完成！\n');
}

liveTest().catch(console.error);

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { imageBase64, patientInfo = {} } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing image data' });
    }
    
    const apiKey = process.env.ANT_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: missing API key' });
    }
    
    // 提取患者信息用于公平性校准
    const { age, gender, hasHistory } = patientInfo;
    const demographicGroup = getDemographicGroup(age, gender);
    
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // 基于 FAST-CAD 论文思想的增强 Prompt
    const systemPrompt = buildFairnessAwarePrompt(demographicGroup, hasHistory);
    
    // 蚂蚁医疗大模型 AntAngelMed
    const response = await fetch('https://api.tbox.cn/api/llm/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'AntAngelMed',
        temperature: 0.2, // 降低随机性，提高一致性
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `请分析这位${age ? age + '岁' : ''}${gender || ''}患者的面部照片，评估脑卒中风险。${hasHistory ? '患者有脑血管病史，需特别关注。' : ''}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`
                }
              }
            ]
          }
        ]
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    let result = parseAIResponse(data);
    
    // 应用 FAST-CAD 风格的公平性校准
    result = applyFairnessCalibration(result, demographicGroup, hasHistory);
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message 
    });
  }
};

// 获取人口统计分组（模拟 FAST-CAD 的 Group-DRO 思想）
function getDemographicGroup(age, gender) {
  if (!age || !gender) return 'unknown';
  
  const ageGroup = age < 45 ? 'young' : age < 65 ? 'middle' : 'elderly';
  return `${ageGroup}_${gender.toLowerCase()}`;
}

// 构建公平性感知的 Prompt（基于 FAST-CAD 论文）
function buildFairnessAwarePrompt(demographicGroup, hasHistory) {
  const groupSpecificGuidance = {
    'young_male': '年轻男性患者，注意排除先天性面部不对称，重点关注急性发作的体征变化。',
    'young_female': '年轻女性患者，注意激素相关因素，仔细观察细微的面部变化。',
    'middle_male': '中年男性患者，高血压风险较高，重点观察典型中风体征。',
    'middle_female': '中年女性患者，更年期后风险增加，注意非典型症状。',
    'elderly_male': '老年男性患者，可能有老年性面部不对称基线，对比变化比绝对值更重要。',
    'elderly_female': '老年女性患者，皮肤松弛可能影响判断，关注深层肌肉运动对称性。'
  };
  
  const guidance = groupSpecificGuidance[demographicGroup] || '综合分析面部对称性和神经功能体征。';
  
  return `你是一位资深神经内科医生，专门通过面部照片识别脑卒中（中风）的早期体征。

【核心诊断原则 - 基于 FAST-CAD 研究】
1. 公平性：对不同年龄、性别的患者采用一致严格的诊断标准
2. 个体化：考虑患者的生理基线，区分先天性与病理性改变
3. 敏感性：宁可过度敏感（假阳性），不可漏诊（假阴性）

【人群特定指导】
${guidance}
${hasHistory ? '\n【病史提醒】该患者有脑血管病史，任何面部不对称都应高度警惕复发可能。' : ''}

【严格诊断标准】
高风险（High）判定标准（满足任一）：
- 明显的口角歪斜（静态或微笑时）
- 单侧眼睑闭合不全或下垂
- 鼻唇沟明显变浅或消失（单侧）
- 额纹不对称（一侧消失）

中风险（Medium）判定标准：
- 轻微的面部不对称，但可见于正常人群
- 疑似但不典型的面瘫体征
- 与患者基线相比有新变化

低风险（Low）判定标准：
- 面部基本对称
- 双侧鼻唇沟、额纹对称
- 无明显的神经功能缺损体征

【置信度评分规则】
- 90-100%: 典型的急性中枢性面瘫三联征（额纹消失+口角歪斜+鼻唇沟变浅）
- 75-89%: 明显的病理性不对称，强烈提示脑卒中
- 60-74%: 中度不对称，需要结合临床症状判断
- 40-59%: 轻度不对称，可能是生理性差异
- 0-39%: 无明显异常

【输出格式 - 必须严格遵循】
{
  "risk_level": "low|medium|high",
  "confidence": 0-100,
  "findings": "详细描述观察到的面部特征和对称性分析",
  "reasoning": "诊断推理过程，说明为什么给出这个风险等级",
  "demographic_note": "针对该人群的特殊考虑",
  "recommendation": "具体的下一步建议"
}`;
}

// 应用公平性校准（模拟 Group-DRO 的最差组优化思想）
function applyFairnessCalibration(result, demographicGroup, hasHistory) {
  let calibratedConfidence = result.confidence;
  let calibratedRisk = result.risk_level;
  
  // 历史病史：提升敏感度（降低阈值）
  if (hasHistory) {
    calibratedConfidence = Math.min(100, calibratedConfidence + 10);
    if (calibratedConfidence > 50 && result.risk_level === 'low') {
      calibratedRisk = 'medium';
    }
  }
  
  // 高龄人群：降低对轻微不对称的敏感度（避免假阳性）
  if (demographicGroup && demographicGroup.startsWith('elderly')) {
    // 老年人常有生理性不对称，需要更高的置信度才判定为高风险
    if (result.risk_level === 'high' && result.confidence < 85) {
      calibratedRisk = 'medium';
      calibratedConfidence -= 10;
    }
  }
  
  // 年轻人群：提升敏感度（年轻人不应该有明显不对称）
  if (demographicGroup && demographicGroup.startsWith('young')) {
    if (result.confidence > 60 && result.risk_level === 'low') {
      calibratedRisk = 'medium';
      calibratedConfidence = Math.min(100, calibratedConfidence + 15);
    }
  }
  
  return {
    ...result,
    confidence: Math.max(0, Math.min(100, Math.round(calibratedConfidence))),
    risk_level: calibratedRisk,
    calibration_applied: true,
    demographic_group: demographicGroup
  };
}

function parseAIResponse(apiResponse) {
  try {
    const content = apiResponse.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        risk_level: parsed.risk_level || 'medium',
        confidence: parsed.confidence || 70,
        findings: parsed.findings || '',
        reasoning: parsed.reasoning || '',
        demographic_note: parsed.demographic_note || '',
        recommendation: parsed.recommendation || '建议咨询专业医生'
      };
    }
    
    // 兜底解析
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('高风险') || lowerContent.includes('明显') || lowerContent.includes('严重')) {
      return { 
        risk_level: 'high', 
        confidence: 85, 
        findings: content.substring(0, 300), 
        reasoning: '检测到明显的病理性体征',
        recommendation: '建议立即就医进行专业检查' 
      };
    } else if (lowerContent.includes('中度') || lowerContent.includes('轻微')) {
      return { 
        risk_level: 'medium', 
        confidence: 65, 
        findings: content.substring(0, 300), 
        reasoning: '存在一定程度的面部不对称',
        recommendation: '建议密切观察，必要时咨询医生' 
      };
    } else {
      return { 
        risk_level: 'low', 
        confidence: 90, 
        findings: content.substring(0, 300), 
        reasoning: '未见明显病理性体征',
        recommendation: '目前未见明显异常，继续保持监测' 
      };
    }
  } catch (e) {
    console.error('Parse error:', e);
    return { 
      risk_level: 'medium', 
      confidence: 50, 
      findings: 'AI 分析完成，但结果解析出现异常', 
      reasoning: '解析错误',
      recommendation: '建议人工复核或重新拍摄' 
    };
  }
}

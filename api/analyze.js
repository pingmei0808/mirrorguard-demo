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
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing image data' });
    }
    
    const apiKey = process.env.ANT_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: missing API key' });
    }
    
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // 蚂蚁医疗大模型 AntAngelMed
    const response = await fetch('https://api.tbox.cn/api/llm/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'AntAngelMed',
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: '你是一位专业的神经内科医生。请分析这张面部照片，评估患者是否存在脑梗（脑卒中）的早期风险特征。\n\n请重点观察以下指标：\n1. 面部左右对称性 - 是否有明显偏斜\n2. 嘴角位置 - 是否有下垂或歪斜\n3. 眼睑状态 - 双眼睑是否对称，有无下垂\n4. 鼻唇沟 - 两侧深浅是否一致\n5. 额纹 - 双侧是否对称\n\n请以JSON格式严格返回以下结构：\n{\n  "risk_level": "low|medium|high",\n  "confidence": 0-100,\n  "findings": "详细描述观察到的面部特征",\n  "medical_analysis": "基于医学知识的专业分析",\n  "recommendation": "给患者的具体建议"\n}\n\nrisk_level定义：\n- low: 面部基本对称，无明显异常\n- medium: 存在轻微不对称，建议进一步观察\n- high: 存在明显面瘫体征，建议立即就医'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`
              }
            }
          ]
        }]
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const result = parseAIResponse(data);
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message 
    });
  }
};

function parseAIResponse(apiResponse) {
  try {
    // 蚂蚁模型返回格式遵循 OpenAI 协议
    const content = apiResponse.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // 确保返回格式统一
      return {
        risk_level: parsed.risk_level || 'medium',
        confidence: parsed.confidence || 70,
        findings: parsed.findings || parsed.medical_analysis || content.substring(0, 200),
        recommendation: parsed.recommendation || '建议咨询专业医生'
      };
    }
    
    // 兜底解析
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('高风险') || lowerContent.includes('明显') || lowerContent.includes('严重')) {
      return { risk_level: 'high', confidence: 85, findings: content.substring(0, 300), recommendation: '建议立即就医进行专业检查' };
    } else if (lowerContent.includes('中度') || lowerContent.includes('轻微') || lowerContent.includes('建议观察')) {
      return { risk_level: 'medium', confidence: 65, findings: content.substring(0, 300), recommendation: '建议密切观察，必要时咨询医生' };
    } else {
      return { risk_level: 'low', confidence: 90, findings: content.substring(0, 300), recommendation: '目前未见明显异常，继续保持监测' };
    }
  } catch (e) {
    console.error('Parse error:', e);
    return { risk_level: 'medium', confidence: 50, findings: 'AI 分析完成，但结果解析出现异常', recommendation: '建议人工复核或重新拍摄' };
  }
}

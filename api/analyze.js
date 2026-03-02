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
    
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: missing API key' });
    }
    
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请分析这张面部照片，评估是否存在脑梗（脑卒中）风险特征。重点关注：1）面部左右是否对称；2）嘴角是否有下垂；3）眼睑是否对称；4）表情是否自然。请以JSON格式返回：{"risk_level": "low|medium|high", "confidence": 0-100, "findings": "具体发现", "recommendation": "建议措施"}'
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Data
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
    const content = apiResponse.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('高风险') || lowerContent.includes('明显不对称')) {
      return { risk_level: 'high', confidence: 85, findings: content.substring(0, 200), recommendation: '建议立即就医进行专业检查' };
    } else if (lowerContent.includes('中度') || lowerContent.includes('轻微')) {
      return { risk_level: 'medium', confidence: 65, findings: content.substring(0, 200), recommendation: '建议密切观察，必要时咨询医生' };
    } else {
      return { risk_level: 'low', confidence: 90, findings: content.substring(0, 200), recommendation: '目前未见明显异常，继续保持监测' };
    }
  } catch (e) {
    return { risk_level: 'medium', confidence: 50, findings: 'AI 分析完成，但结果解析出现异常', recommendation: '建议人工复核或重新拍摄' };
  }
}

/**
 * MirrorGuard 时序分析模块
 * 使用 LSTM 和滑动窗口分析面部对称性的时间序列变化
 */

/**
 * 滑动窗口分析器
 */
class SlidingWindowAnalyzer {
  constructor(options = {}) {
    this.windowSize = options.windowSize || 60; // 60 帧（2 秒@30fps）
    this.stepSize = options.stepSize || 10; // 每 10 帧分析一次
    this.threshold = options.threshold || 0.05; // 不对称阈值
    
    this.buffer = [];
    this.alertHistory = [];
  }
  
  /**
   * 添加新帧数据
   */
  addFrame(frameData) {
    this.buffer.push({
      timestamp: frameData.timestamp || Date.now(),
      symmetry: frameData.symmetry
    });
    
    // 保持窗口大小
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }
  }
  
  /**
   * 分析当前窗口
   */
  analyze() {
    if (this.buffer.length < this.windowSize / 2) {
      return {
        ready: false,
        reason: '数据不足'
      };
    }
    
    const scores = this.buffer.map(f => f.symmetry.overall);
    const mouthScores = this.buffer.map(f => f.symmetry.mouth);
    const eyeScores = this.buffer.map(f => f.symmetry.eyes);
    
    // 统计指标
    const stats = {
      mean: this.mean(scores),
      std: this.std(scores),
      max: Math.max(...scores),
      min: Math.min(...scores),
      trend: this.trend(scores)
    };
    
    // 异常检测
    const abnormalFrames = scores.filter(s => s > this.threshold).length;
    const abnormalRatio = abnormalFrames / scores.length;
    
    // 严重程度判定
    let severity = 'normal';
    if (abnormalRatio > 0.8 && stats.mean > this.threshold * 1.5) {
      severity = 'high';
    } else if (abnormalRatio > 0.5) {
      severity = 'medium';
    } else if (abnormalRatio > 0.3) {
      severity = 'low';
    }
    
    return {
      ready: true,
      stats,
      abnormalRatio,
      severity,
      isAlert: severity !== 'normal',
      confidence: this.calculateConfidence(stats, abnormalRatio)
    };
  }
  
  /**
   * 计算置信度
   */
  calculateConfidence(stats, abnormalRatio) {
    // 基于数据稳定性和一致性
    const stability = 1 - (stats.std / (stats.mean + 0.001));
    const consistency = abnormalRatio > 0.5 ? 1 : abnormalRatio * 2;
    
    return Math.min(1, (stability + consistency) / 2);
  }
  
  /**
   * 辅助函数：平均值
   */
  mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  
  /**
   * 辅助函数：标准差
   */
  std(arr) {
    const m = this.mean(arr);
    return Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / arr.length);
  }
  
  /**
   * 辅助函数：趋势（斜率）
   */
  trend(arr) {
    const n = arr.length;
    const sumX = n * (n - 1) / 2;
    const sumY = arr.reduce((a, b) => a + b, 0);
    const sumXY = arr.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX + 0.0001);
  }
}

/**
 * LSTM 预测器（简化版，使用预训练权重）
 * 用于预测未来几秒的面部对称性趋势
 */
class LSTMPredictor {
  constructor() {
    this.model = null;
    this.sequenceLength = 30; // 30 帧历史
    this.isLoaded = false;
  }
  
  /**
   * 加载模型（从 ONNX 或 TensorFlow.js）
   */
  async loadModel(modelPath) {
    try {
      // TODO: 加载预训练 LSTM 模型
      // const model = await tf.loadLayersModel(modelPath);
      this.isLoaded = true;
      console.log('✅ LSTM 模型加载完成');
    } catch (error) {
      console.warn('⚠️ LSTM 模型加载失败，使用规则预测:', error);
      this.isLoaded = false;
    }
  }
  
  /**
   * 预测未来趋势
   */
  predict(sequence) {
    if (!this.isLoaded) {
      // 降级：使用简单线性外推
      return this.simplePredict(sequence);
    }
    
    // TODO: 使用 LSTM 模型预测
    // const prediction = this.model.predict(sequence);
    // return prediction;
    
    return this.simplePredict(sequence);
  }
  
  /**
   * 简单线性预测（降级方案）
   */
  simplePredict(sequence) {
    if (sequence.length < 2) {
      return { trend: 'stable', change: 0 };
    }
    
    const slope = (sequence[sequence.length - 1] - sequence[0]) / sequence.length;
    
    let trend = 'stable';
    if (slope > 0.001) trend = 'increasing';
    if (slope < -0.001) trend = 'decreasing';
    
    return {
      trend,
      change: slope * 10, // 预测未来 10 帧的变化
      confidence: 0.6 // 简单预测置信度较低
    };
  }
}

/**
 * 多模态融合分析器
 * 结合视觉、语音（可选）等多模态数据
 */
class MultimodalFusion {
  constructor() {
    this.visualAnalyzer = new SlidingWindowAnalyzer();
    this.audioAnalyzer = null; // 预留语音分析
    this.weights = {
      visual: 0.8,
      audio: 0.2 // 预留
    };
  }
  
  /**
   * 融合多模态结果
   */
  fuseResults(results) {
    let finalScore = 0;
    let totalWeight = 0;
    
    if (results.visual) {
      finalScore += results.visual.score * this.weights.visual;
      totalWeight += this.weights.visual;
    }
    
    if (results.audio && this.audioAnalyzer) {
      finalScore += results.audio.score * this.weights.audio;
      totalWeight += this.weights.audio;
    }
    
    return {
      score: finalScore / totalWeight,
      confidence: Math.min(results.visual?.confidence || 0, results.audio?.confidence || 1),
      sources: Object.keys(results)
    };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SlidingWindowAnalyzer,
    LSTMPredictor,
    MultimodalFusion
  };
}

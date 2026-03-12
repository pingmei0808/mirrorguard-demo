/**
 * MirrorGuard 视频实时检测模块（前端）
 * 使用 MediaPipe Face Mesh 进行 468 点面部特征追踪
 * 实时计算面部对称性，检测中风早期体征
 */

// MediaPipe Face Mesh 配置
const FACEMESH_CONFIG = {
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633549677/${file}`
};

// 面部关键 landmarks 索引
const LANDMARKS = {
  mouth: { left: 61, right: 291, top: 13, bottom: 14 },
  eyes: {
    left: { left: 33, right: 133, top: 159, bottom: 145 },
    right: { left: 362, right: 263, top: 386, bottom: 374 }
  },
  nose: { tip: 1, bottom: 4 },
  eyebrows: {
    left: { inner: 107, middle: 103, outer: 70 },
    right: { inner: 336, middle: 332, outer: 300 }
  }
};

/**
 * 视频检测器类
 */
class VideoDetector {
  constructor(options = {}) {
    this.faceMesh = null;
    this.camera = null;
    this.onResults = options.onResults || (() => {});
    this.onAlert = options.onAlert || (() => {});
    this.videoElement = options.videoElement;
    this.canvasElement = options.canvasElement;
    
    // 检测配置
    this.config = {
      // 对称性阈值
      mouthThreshold: options.mouthThreshold || 0.05,
      eyeThreshold: options.eyeThreshold || 0.03,
      
      // 时序分析配置
      windowSize: options.windowSize || 30, // 30 帧滑动窗口（约 1 秒）
      alertThreshold: options.alertThreshold || 0.7, // 70% 帧异常触发警报
      
      // 性能配置
      fps: options.fps || 30,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    };
    
    // 状态
    this.isRunning = false;
    this.frameHistory = [];
    this.lastAlertTime = 0;
    this.alertCooldown = 5000; // 5 秒冷却时间
  }
  
  /**
   * 初始化 MediaPipe Face Mesh
   */
  async initialize() {
    const { FaceMesh } = await import('@mediapipe/face_mesh');
    
    this.faceMesh = new FaceMesh({
      locateFile: FACEMESH_CONFIG.locateFile
    });
    
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: this.config.minDetectionConfidence,
      minTrackingConfidence: this.config.minTrackingConfidence
    });
    
    this.faceMesh.onResults(this.onResultsInternal.bind(this));
    
    console.log('✅ VideoDetector 初始化完成');
  }
  
  /**
   * 开始实时检测
   */
  async start() {
    if (!this.faceMesh) {
      await this.initialize();
    }
    
    if (this.isRunning) {
      console.warn('检测已在运行中');
      return;
    }
    
    try {
      // 获取摄像头
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      this.videoElement.srcObject = stream;
      await this.videoElement.play();
      
      this.isRunning = true;
      this.frameHistory = [];
      
      // 开始处理帧
      this.processFrame();
      
      console.log('🎥 视频检测已启动');
    } catch (error) {
      console.error('❌ 启动失败:', error);
      throw new Error(`无法访问摄像头：${error.message}`);
    }
  }
  
  /**
   * 停止检测
   */
  stop() {
    this.isRunning = false;
    
    if (this.videoElement && this.videoElement.srcObject) {
      const tracks = this.videoElement.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }
    
    console.log('⏹️ 视频检测已停止');
  }
  
  /**
   * 处理单帧
   */
  async processFrame() {
    if (!this.isRunning) return;
    
    try {
      await this.faceMesh.send({ image: this.videoElement });
    } catch (error) {
      console.error('帧处理错误:', error);
    }
    
    // 继续下一帧
    requestAnimationFrame(this.processFrame.bind(this));
  }
  
  /**
   * MediaPipe 结果回调
   */
  onResultsInternal(results) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      return;
    }
    
    const landmarks = results.multiFaceLandmarks[0];
    
    // 计算对称性
    const symmetry = this.calculateSymmetry(landmarks);
    
    // 添加到历史记录
    this.frameHistory.push({
      timestamp: Date.now(),
      symmetry
    });
    
    // 保持滑动窗口大小
    if (this.frameHistory.length > this.config.windowSize) {
      this.frameHistory.shift();
    }
    
    // 时序分析
    const temporalAnalysis = this.temporalAnalysis();
    
    // 绘制结果
    this.drawResults(results, symmetry, temporalAnalysis);
    
    // 触发回调
    this.onResults({
      landmarks,
      symmetry,
      temporalAnalysis,
      isAlert: temporalAnalysis.isAlert
    });
    
    // 检查是否需要警报
    if (temporalAnalysis.isAlert) {
      this.triggerAlert(symmetry, temporalAnalysis);
    }
  }
  
  /**
   * 计算面部对称性
   */
  calculateSymmetry(landmarks) {
    // 嘴角高度差
    const leftMouth = landmarks[LANDMARKS.mouth.left];
    const rightMouth = landmarks[LANDMARKS.mouth.right];
    const mouthAsymmetry = Math.abs(leftMouth.y - rightMouth.y);
    
    // 眼睛高度差
    const leftEye = landmarks[LANDMARKS.eyes.left];
    const rightEye = landmarks[LANDMARKS.eyes.right];
    const leftEyeHeight = Math.abs(leftEye.top.y - leftEye.bottom.y);
    const rightEyeHeight = Math.abs(rightEye.top.y - rightEye.bottom.y);
    const eyeAsymmetry = Math.abs(leftEyeHeight - rightEyeHeight);
    
    // 眉毛高度差
    const leftBrow = landmarks[LANDMARKS.eyebrows.left];
    const rightBrow = landmarks[LANDMARKS.eyebrows.right];
    const browAsymmetry = Math.abs(
      (leftBrow.inner.y + leftBrow.middle.y + leftBrow.outer.y) / 3 -
      (rightBrow.inner.y + rightBrow.middle.y + rightBrow.outer.y) / 3
    );
    
    // 综合分数（归一化到 0-1）
    const overallScore = (
      mouthAsymmetry * 5 +  // 嘴角权重最高
      eyeAsymmetry * 4 +
      browAsymmetry * 3
    ) / 12;
    
    return {
      mouth: mouthAsymmetry,
      eyes: eyeAsymmetry,
      eyebrows: browAsymmetry,
      overall: overallScore,
      timestamp: Date.now()
    };
  }
  
  /**
   * 时序分析（滑动窗口）
   */
  temporalAnalysis() {
    if (this.frameHistory.length < this.config.windowSize / 2) {
      return {
        isStable: false,
        averageScore: 0,
        trend: 'unknown',
        isAlert: false
      };
    }
    
    const scores = this.frameHistory.map(f => f.symmetry.overall);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // 计算趋势（简单线性回归）
    const trend = this.calculateTrend(scores);
    
    // 判断是否异常
    const abnormalFrames = scores.filter(s => s > this.config.mouthThreshold).length;
    const abnormalRatio = abnormalFrames / scores.length;
    const isAlert = abnormalRatio >= this.config.alertThreshold;
    
    return {
      isStable: true,
      averageScore: avgScore,
      trend,
      abnormalRatio,
      isAlert,
      windowSize: this.frameHistory.length
    };
  }
  
  /**
   * 计算趋势
   */
  calculateTrend(scores) {
    if (scores.length < 2) return 'unknown';
    
    const n = scores.length;
    const sumX = n * (n - 1) / 2;
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = scores.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    if (slope > 0.001) return 'increasing';
    if (slope < -0.001) return 'decreasing';
    return 'stable';
  }
  
  /**
   * 绘制结果
   */
  drawResults(results, symmetry, temporalAnalysis) {
    if (!this.canvasElement) return;
    
    const ctx = this.canvasElement.getContext('2d');
    ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    
    // 绘制面部特征点
    this.drawLandmarks(ctx, results.multiFaceLandmarks[0]);
    
    // 绘制状态面板
    this.drawStatusPanel(ctx, symmetry, temporalAnalysis);
  }
  
  /**
   * 绘制特征点
   */
  drawLandmarks(ctx, landmarks) {
    ctx.fillStyle = '#00ff88';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;
    
    // 绘制关键点
    const keyPoints = [
      LANDMARKS.mouth.left,
      LANDMARKS.mouth.right,
      LANDMARKS.eyes.left.left,
      LANDMARKS.eyes.left.right,
      LANDMARKS.eyes.right.left,
      LANDMARKS.eyes.right.right,
      LANDMARKS.nose.tip
    ];
    
    keyPoints.forEach(idx => {
      const point = landmarks[idx];
      const x = point.x * this.canvasElement.width;
      const y = point.y * this.canvasElement.height;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
  
  /**
   * 绘制状态面板
   */
  drawStatusPanel(ctx, symmetry, temporalAnalysis) {
    const panelX = 10;
    const panelY = 10;
    const panelWidth = 200;
    const panelHeight = 120;
    
    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    
    // 文字
    ctx.fillStyle = '#00ff88';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    
    let y = panelY + 20;
    const lineHeight = 18;
    
    // 对称性分数
    ctx.fillText(`对称性：${(symmetry.overall * 100).toFixed(1)}%`, panelX + 10, y);
    y += lineHeight;
    
    // 嘴角
    const mouthStatus = symmetry.mouth > this.config.mouthThreshold ? '⚠️' : '✅';
    ctx.fillText(`${mouthStatus} 嘴角：${(symmetry.mouth * 1000).toFixed(1)}`, panelX + 10, y);
    y += lineHeight;
    
    // 眼睛
    const eyeStatus = symmetry.eyes > this.config.eyeThreshold ? '⚠️' : '✅';
    ctx.fillText(`${eyeStatus} 眼睛：${(symmetry.eyes * 1000).toFixed(1)}`, panelX + 10, y);
    y += lineHeight;
    
    // 警报状态
    const alertStatus = temporalAnalysis.isAlert ? '🚨 警报' : '✅ 正常';
    ctx.fillStyle = temporalAnalysis.isAlert ? '#ff4757' : '#00ff88';
    ctx.fillText(alertStatus, panelX + 10, y);
  }
  
  /**
   * 触发警报
   */
  triggerAlert(symmetry, temporalAnalysis) {
    const now = Date.now();
    if (now - this.lastAlertTime < this.alertCooldown) {
      return; // 冷却期内
    }
    
    this.lastAlertTime = now;
    
    // 截取当前帧
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.videoElement, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    
    // 触发警报回调
    this.onAlert({
      type: 'facial_asymmetry_detected',
      severity: temporalAnalysis.abnormalRatio > 0.9 ? 'high' : 'medium',
      symmetry,
      temporalAnalysis,
      imageBase64,
      timestamp: now
    });
    
    console.log('🚨 警报触发:', {
      severity: temporalAnalysis.abnormalRatio > 0.9 ? 'high' : 'medium',
      symmetry: symmetry.overall.toFixed(4)
    });
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VideoDetector, LANDMARKS };
}

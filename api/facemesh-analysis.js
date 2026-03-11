/**
 * MediaPipe Face Mesh 面部特征分析模块
 */
const FACIAL_LANDMARKS = {
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

function calculateFacialSymmetry(landmarks) {
  if (!landmarks || landmarks.length < 468) throw new Error('需要 468 个特征点');
  const leftMouth = landmarks[61], rightMouth = landmarks[291];
  const mouthAsymmetryY = Math.abs(leftMouth.y - rightMouth.y);
  const leftEye = landmarks[159], rightEye = landmarks[386];
  const eyeAsymmetry = Math.abs(leftEye.y - rightEye.y);
  const overallScore = Math.min(100, (mouthAsymmetryY * 500 + eyeAsymmetry * 400) / 2);
  return {
    scores: { mouth: (mouthAsymmetryY * 500).toFixed(2), eyes: (eyeAsymmetry * 400).toFixed(2), overall: overallScore.toFixed(2) },
    riskLevel: overallScore >= 60 ? 'high' : overallScore >= 30 ? 'medium' : 'low',
    confidence: 85
  };
}

module.exports = { calculateFacialSymmetry, FACIAL_LANDMARKS };

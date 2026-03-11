# MirrorGuard 公开数据集测试方案

## 📊 可用数据集

### 1. Kaggle - Facial Droop & Paralysis ⭐ 推荐首选

**链接：** https://www.kaggle.com/datasets/kaitavmehta/facial-droop-and-facial-paralysis-image

**特点：**
- 包含面部下垂和面瘫图像
- 免费，需 Kaggle 账号
- 约 200-500 张图片

**下载方法：**
```bash
# 安装 Kaggle CLI
pip install kaggle

# 配置 API token（在 Kaggle 账户设置中获取）
mkdir -p ~/.kaggle
cp kaggle.json ~/.kaggle/
chmod 600 ~/.kaggle/kaggle.json

# 下载数据集
kaggle datasets download -d kaitavmehta/facial-droop-and-facial-paralysis-image
unzip facial-droop-and-facial-paralysis-image.zip -d datasets/kaggle-facial-droop/
```

---

### 2. YouTube Face Palsy (YFP) Database

**链接：** https://github.com/AvLab-CV/YouTube-Facial-Palsy-Database

**特点：**
- 从 YouTube 收集的面瘫患者视频
- 包含不同严重程度的样本
- 免费开源

**下载方法：**
```bash
cd datasets/
git clone https://github.com/AvLab-CV/YouTube-Facial-Palsy-Database.git yfp
```

---

### 3. IEEE DataPort - Facial Paralysis Dataset

**链接：** https://ieee-dataport.org/documents/facial-paralysis-dataset

**特点：**
- 学术论文配套数据集
- 需要 IEEE 账号（免费）
- 质量较高

---

### 4. 替代方案：面部表情数据集（用于基线测试）

如果以上数据集获取困难，可以先用这些**更容易获取**的数据集：

| 数据集 | 链接 | 用途 |
|--------|------|------|
| **FER-2013** | https://www.kaggle.com/datasets/msambare/fer2013 | 面部表情，测试基础功能 |
| **CelebA-HQ** | https://github.com/tkarras/progressive_growing_of_gans | 高质量人脸，测试对称性算法 |
| **HELEN** | https://www.sifeiliu.net/face-parsing | 面部解析，测试特征点检测 |

---

## 🚀 快速启动（推荐流程）

### 方案 A：Kaggle 数据集（最快）

```bash
# 1. 注册 Kaggle 账号（免费）
# 2. 获取 API Token：https://www.kaggle.com/settings
# 3. 下载并运行

cd /home/admin/.openclaw/workspace/mirrorguard-demo

# 创建数据集目录
mkdir -p datasets/kaggle-facial-droop

# 下载（需要 kaggle.json）
kaggle datasets download -d kaitavmehta/facial-droop-and-facial-paralysis-image
unzip facial-droop-and-facial-paralysis-image.zip -d datasets/kaggle-facial-droop/

# 创建标注文件（参考下面的模板）
# 运行测试
node scripts/dataset-test.js test kaggle-facial-droop
```

---

### 方案 B：YFP GitHub 数据集（无需账号）

```bash
cd /home/admin/.openclaw/workspace/mirrorguard-demo/datasets
git clone https://github.com/AvLab-CV/YouTube-Facial-Palsy-Database.git yfp

# 创建标注文件
# 运行测试
node scripts/dataset-test.js test yfp
```

---

## 📝 标注文件模板

对于每个数据集，需要创建 `annotations.json`：

```json
[
  {
    "filename": "images/subject_001.jpg",
    "label": "high",
    "severity": 3,
    "patientInfo": {
      "age": 67,
      "gender": "male",
      "hasHistory": false
    },
    "notes": "明显口角歪斜，左侧鼻唇沟消失"
  },
  {
    "filename": "images/subject_002.jpg",
    "label": "low",
    "severity": 0,
    "patientInfo": {
      "age": 45,
      "gender": "female",
      "hasHistory": false
    },
    "notes": "面部对称，无明显异常"
  }
]
```

**标签说明：**
- `label`: "low" | "medium" | "high"
- `severity`: 0-4 (0=正常，4=严重)

---

## 📈 测试流程

### 步骤 1：准备数据集
```bash
mkdir -p datasets/kaggle-facial-droop/images
# 下载图片到 images/ 目录
```

### 步骤 2：创建标注
```bash
# 手动或使用半自动工具标注 50-100 张图片
# 创建 datasets/kaggle-facial-droop/annotations.json
```

### 步骤 3：运行测试
```bash
cd /home/admin/.openclaw/workspace/mirrorguard-demo

# 设置环境变量
export ANTHROPIC_API_KEY="sk-ant-xxx"
export MIRRORGUARD_API_URL="https://mirrorguard-demo.vercel.app/api/analyze"

# 运行测试
node scripts/dataset-test.js test kaggle-facial-droop
```

### 步骤 4：查看结果
```bash
# 结果保存在 test-results/ 目录
cat test-results/kaggle-facial-droop-*.json
```

---

## ⏱️ 时间预估

| 任务 | 时间 |
|------|------|
| 注册 Kaggle + 下载 | 10 分钟 |
| 标注 50 张图片 | 1-2 小时 |
| 运行测试 | 30 分钟 |
| **总计** | **约 2-3 小时** |

---

## 💡 建议

1. **先小批量测试** - 标注 20-30 张图片快速验证
2. **逐步扩大** - 确认流程正确后再标注更多
3. **多人标注** - 如有条件，让 2-3 人独立标注，计算一致性

---

**需要我帮你：**
1. 写下载脚本？
2. 创建标注工具？
3. 准备标注说明文档？

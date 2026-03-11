#!/bin/bash
# MirrorGuard 数据集下载脚本

set -e

DATASETS_DIR="./datasets"
mkdir -p "$DATASETS_DIR"

echo "🚀 MirrorGuard 数据集下载"
echo "=========================="

# 选项菜单
echo ""
echo "选择要下载的数据集："
echo "1. YouTube Face Palsy (GitHub, 免费)"
echo "2. Kaggle Facial Droop (需要 Kaggle 账号)"
echo "3. 全部下载"
echo ""
read -p "请输入选项 (1/2/3): " choice

case $choice in
  1)
    echo ""
    echo "📥 下载 YouTube Face Palsy 数据集..."
    cd "$DATASETS_DIR"
    if [ -d "yfp" ]; then
      echo "✅ YFP 数据集已存在"
    else
      git clone https://github.com/AvLab-CV/YouTube-Facial-Palsy-Database.git yfp
      echo "✅ YFP 数据集下载完成"
    fi
    cd ..
    ;;
    
  2)
    echo ""
    echo "📥 下载 Kaggle Facial Droop 数据集..."
    
    # 检查 kaggle CLI
    if ! command -v kaggle &> /dev/null; then
      echo "⚠️  未检测到 Kaggle CLI，正在安装..."
      pip install kaggle
    fi
    
    # 检查 API token
    if [ ! -f ~/.kaggle/kaggle.json ]; then
      echo "❌ 未找到 Kaggle API token"
      echo ""
      echo "请按以下步骤获取："
      echo "1. 访问 https://www.kaggle.com/settings"
      echo "2. 点击 'Create New API Token'"
      echo "3. 将下载的 kaggle.json 放到 ~/.kaggle/"
      echo ""
      read -p "完成后按回车继续..."
    fi
    
    mkdir -p "$DATASETS_DIR/kaggle-facial-droop"
    cd "$DATASETS_DIR/kaggle-facial-droop"
    
    echo "正在下载..."
    kaggle datasets download -d kaitavmehta/facial-droop-and-facial-paralysis-image
    
    echo "正在解压..."
    unzip -o facial-droop-and-facial-paralysis-image.zip
    
    echo "✅ Kaggle 数据集下载完成"
    cd ../..
    ;;
    
  3)
    echo ""
    echo "📥 下载全部数据集..."
    
    # YFP
    cd "$DATASETS_DIR"
    if [ ! -d "yfp" ]; then
      git clone https://github.com/AvLab-CV/YouTube-Facial-Palsy-Database.git yfp
      echo "✅ YFP 下载完成"
    else
      echo "⏭️  YFP 已存在，跳过"
    fi
    cd ..
    
    # Kaggle
    if command -v kaggle &> /dev/null && [ -f ~/.kaggle/kaggle.json ]; then
      mkdir -p "$DATASETS_DIR/kaggle-facial-droop"
      cd "$DATASETS_DIR/kaggle-facial-droop"
      kaggle datasets download -d kaitavmehta/facial-droop-and-facial-paralysis-image
      unzip -o facial-droop-and-facial-paralysis-image.zip
      echo "✅ Kaggle 下载完成"
      cd ../..
    else
      echo "⏭️  Kaggle 需要 API token，跳过"
    fi
    ;;
    
  *)
    echo "❌ 无效选项"
    exit 1
    ;;
esac

echo ""
echo "=========================="
echo "✅ 数据集下载完成！"
echo ""
echo "下一步："
echo "1. 检查 datasets/ 目录"
echo "2. 创建或编辑 annotations.json"
echo "3. 运行：node scripts/dataset-test.js test <dataset>"
echo ""

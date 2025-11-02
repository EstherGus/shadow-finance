#!/bin/bash

# Vercel 部署脚本
# 项目名称: sf-39vmudh9p (随机生成，避免出现 galaxys-projects)

set -e

echo "🚀 开始部署到 Vercel..."

# 检查 token
if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ 错误: 请设置 VERCEL_TOKEN 环境变量"
    echo "使用方法: export VERCEL_TOKEN=your_token && ./deploy-vercel.sh"
    exit 1
fi

# 确保已构建
echo "📦 构建项目..."
npm run build

# 部署到 Vercel
echo "🌐 部署到 Vercel..."
npx vercel --token "$VERCEL_TOKEN" --yes --prod --name sf-39vmudh9p

echo "✅ 部署完成!"




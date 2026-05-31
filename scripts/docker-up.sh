#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "🎾 Tennis Platform - Docker 生产部署"
echo ""

# 停掉开发服务（如果在跑）
echo "🔪 清理开发端口..."
lsof -ti:3000,3001,3003 | xargs kill -9 2>/dev/null

# 确认 .env 存在
if [ ! -f .env ]; then
  echo "❌ 未找到 .env 文件，请先执行："
  echo "   cp .env.example .env"
  echo "   然后编辑 .env 填入配置"
  exit 1
fi

# 构建并启动
echo "🏗️  构建 Docker 镜像..."
docker compose build

echo "🚀 启动所有服务..."
docker compose up -d

echo "⏳ 等待服务就绪..."
sleep 15

# 健康检查
echo "🔍 健康检查..."
if curl -s http://localhost/api/health | grep -q '"status":"ok"'; then
  echo "✅ API 健康"
else
  echo "⚠️  API 可能还未就绪，请稍后访问"
fi

echo ""
docker compose ps
echo ""
echo "✅ 部署完成！"
echo ""
echo "   C 端:     http://localhost"
echo "   管理后台:  http://localhost:8080/admin"
echo "   API:      http://localhost/api/health"
echo ""
echo "查看日志: docker compose logs -f"
echo "停止服务: docker compose down"

#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "🛑 停止 Docker 服务..."
docker compose down

echo "🔄 恢复开发环境..."
if [ -f .env.dev.backup ]; then
  cp .env.dev.backup .env
  echo "✅ .env 已恢复为开发配置"
else
  echo "⚠️  未找到 .env.dev.backup，请手动确认 .env 中的数据库地址"
  grep -E "DATABASE_URL|REDIS_URL" .env
fi

echo ""
echo "✅ Docker 已停止，可以运行开发模式："
echo "   bash scripts/dev.sh"

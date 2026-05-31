#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "🎾 Tennis Platform - 开发模式启动"
echo ""

# 1. 清理端口
echo "🔪 清理端口..."
lsof -ti:3000,3001,3003 | xargs kill -9 2>/dev/null
sleep 1

# 2. 确认 Docker 数据库在跑
echo "🐳 启动数据库..."
docker compose -f docker-compose.dev.yml up -d
echo "⏳ 等待数据库就绪..."
sleep 3

# 3. 验证数据库连接
curl -s http://localhost:3000/api/health > /dev/null 2>&1 || true

# 4. 启动 API（后台）
echo "🚀 启动 API (port 3000)..."
pnpm --filter @tennis/api start:dev &
API_PID=$!
echo "   API PID: $API_PID"

# 等 API 启动
sleep 5

# 5. 启动管理后台（后台）
echo "🚀 启动管理后台 (port 3001)..."
pnpm --filter @tennis/web-admin dev &
ADMIN_PID=$!
echo "   Admin PID: $ADMIN_PID"

# 6. 启动 C 端（后台）
echo "🚀 启动 C 端 (port 3003)..."
pnpm --filter @tennis/web-customer dev &
CUSTOMER_PID=$!
echo "   Customer PID: $CUSTOMER_PID"

echo ""
echo "✅ 所有服务启动中..."
echo ""
echo "   API:      http://localhost:3000"
echo "   管理后台:  http://localhost:3001/admin"
echo "   C 端:     http://localhost:3003"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 捕获 Ctrl+C，停止所有子进程
trap "echo ''; echo '🛑 停止所有服务...'; kill $API_PID $ADMIN_PID $CUSTOMER_PID 2>/dev/null; exit 0" INT

# 等待所有后台进程
wait

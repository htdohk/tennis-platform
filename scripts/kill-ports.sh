#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "🔪 清理开发端口..."
lsof -ti:3000,3001,3003,3100,8080 | xargs kill -9 2>/dev/null
echo "✅ 端口 3000/3001/3003/3100/8080 已清理"

#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "⚠️  警告：此操作将清空数据库并重新初始化！"
read -p "确认继续？(y/N) " confirm
if [ "$confirm" != "y" ]; then
  echo "已取消"
  exit 0
fi

echo "🗑️  重置数据库..."
pnpm prisma migrate reset --force
echo "🌱 写入种子数据..."
pnpm prisma db seed
echo "✅ 数据库已重置"

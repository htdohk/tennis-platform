#!/bin/bash

# tennis-platform 一键启动脚本
# 用法: ./dev.sh
# 停止: Ctrl+C (会自动清理所有子进程)

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 存储子进程 PID
PIDS=()

# 清理函数：Ctrl+C 时杀掉所有子进程
cleanup() {
  echo ""
  echo -e "${YELLOW}正在停止所有服务...${NC}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null
  echo -e "${GREEN}所有服务已停止。${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "${CYAN}"
echo "╔══════════════════════════════════════╗"
echo "║     🎾 Tennis Platform Dev Start     ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

# ─── 1. 检查 Docker ───────────────────────────────────────
echo -e "${BLUE}[1/4] 检查 Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker 未运行，请先启动 Docker Desktop${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Docker 已运行${NC}"

# ─── 2. 启动 Docker 服务（Postgres + Redis）──────────────
echo -e "${BLUE}[2/4] 启动 Postgres + Redis...${NC}"
docker compose -f docker-compose.dev.yml up -d > /dev/null 2>&1

# 等待 Postgres 健康
echo -n "   等待 Postgres 就绪"
for i in $(seq 1 30); do
  if docker exec tennis-platform-postgres-1 pg_isready -U dev -d tennis > /dev/null 2>&1; then
    echo -e " ${GREEN}✅${NC}"
    break
  fi
  echo -n "."
  sleep 1
  if [ "$i" -eq 30 ]; then
    echo -e " ${RED}❌ 超时${NC}"
    exit 1
  fi
done

# 等待 Redis 健康
echo -n "   等待 Redis 就绪"
for i in $(seq 1 15); do
  if docker exec tennis-platform-redis-1 redis-cli ping > /dev/null 2>&1; then
    echo -e " ${GREEN}✅${NC}"
    break
  fi
  echo -n "."
  sleep 1
done

# ─── 3. 释放端口（杀掉残留进程）─────────────────────────
echo -e "${BLUE}[3/4] 释放端口 3000 / 3001 / 3003...${NC}"
for port in 3000 3001 3003; do
  # 多次尝试杀进程
  for attempt in 1 2 3; do
    pid=$(lsof -ti:"$port" 2>/dev/null || true)
    if [ -z "$pid" ]; then
      break
    fi
    kill -9 "$pid" 2>/dev/null || true
    sleep 0.5
  done
  # 最终确认
  pid=$(lsof -ti:"$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo -e "   ${RED}⚠️  端口 $port 仍被占用 (PID: $pid)，请手动处理${NC}"
  else
    echo -e "   端口 $port ${GREEN}✅${NC}"
  fi
done
sleep 1

# ─── 4. 启动三个应用 ──────────────────────────────────────
echo -e "${BLUE}[4/4] 启动应用服务...${NC}"

# API (3000)
echo -e "   🚀 启动 API        → ${CYAN}http://localhost:3000${NC}"
pnpm --filter @tennis/api start:dev \
  > /tmp/tennis-api.log 2>&1 &
PIDS+=($!)

# Web Admin (3001)
echo -e "   🚀 启动 Web Admin  → ${CYAN}http://localhost:3001${NC}"
pnpm --filter @tennis/web-admin dev \
  > /tmp/tennis-admin.log 2>&1 &
PIDS+=($!)

# Web Customer (3003)
echo -e "   🚀 启动 Web Customer → ${CYAN}http://localhost:3003${NC}"
pnpm --filter @tennis/web-customer dev \
  > /tmp/tennis-customer.log 2>&1 &
PIDS+=($!)

echo ""
echo -e "${YELLOW}等待服务启动（约 15 秒）...${NC}"
echo -e "日志位置："
echo -e "  API:      tail -f /tmp/tennis-api.log"
echo -e "  Admin:    tail -f /tmp/tennis-admin.log"
echo -e "  Customer: tail -f /tmp/tennis-customer.log"
echo ""

# 等待 API 就绪
echo -n "   等待 API 就绪"
for i in $(seq 1 60); do
  if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e " ${GREEN}✅${NC}"
    break
  fi
  echo -n "."
  sleep 1
  if [ "$i" -eq 60 ]; then
    echo -e " ${RED}❌ API 启动超时，请查看日志：tail -f /tmp/tennis-api.log${NC}"
  fi
done

# 等待 Admin 就绪
echo -n "   等待 Admin 就绪"
for i in $(seq 1 60); do
  if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e " ${GREEN}✅${NC}"
    break
  fi
  echo -n "."
  sleep 1
done

# 等待 Customer 就绪
echo -n "   等待 Customer 就绪"
for i in $(seq 1 60); do
  if curl -s http://localhost:3003 > /dev/null 2>&1; then
    echo -e " ${GREEN}✅${NC}"
    break
  fi
  echo -n "."
  sleep 1
done

# ─── 自动打开浏览器 ───────────────────────────────────────
echo ""
echo -e "${GREEN}✅ 所有服务已就绪！正在打开浏览器...${NC}"
sleep 1
open "http://localhost:3001/admin"   # 管理后台
sleep 0.5
open "http://localhost:3003"          # 用户端

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  服务运行中，按 Ctrl+C 停止所有服务          ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  API:      http://localhost:3000/api/health  ║${NC}"
echo -e "${CYAN}║  Admin:    http://localhost:3001/admin       ║${NC}"
echo -e "${CYAN}║  Customer: http://localhost:3003             ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# 保持脚本运行，等待 Ctrl+C
wait
#!/bin/bash
# 用法：bash scripts/bind-hermes.sh <userId> <hermesId> [groupId]
# 示例：bash scripts/bind-hermes.sh cmplfryh9000eh49k4f4tz8h9 "wx_user_123" "group_456"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

USER_ID="${1:?请提供 userId}"
HERMES_ID="${2:?请提供 hermesId}"
GROUP_ID="${3:-}"

curl -s -X POST http://localhost:3000/internal/binding/manual \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: $(grep MCP_INTERNAL_TOKEN .env | cut -d= -f2)" \
  -d "{\"userId\":\"$USER_ID\",\"hermesId\":\"$HERMES_ID\",\"groupId\":\"$GROUP_ID\"}" | \
  python3 -m json.tool

echo ""
echo "绑定完成：userId=$USER_ID hermesId=$HERMES_ID groupId=$GROUP_ID"

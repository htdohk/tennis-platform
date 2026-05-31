# Hermes 接入配置指南

## 环境要求

- tennis-platform 已部署（Docker 或开发模式）
- MCP Server 已构建：`pnpm --filter @tennis/mcp-server build`

## MCP Server 启动

```bash
# 开发环境
node apps/mcp-server/dist/index.js

# 生产环境（Docker 已包含，无需单独启动）
```

## 环境变量

```
INTERNAL_API_BASE_URL=http://your-api-domain  # 或 http://localhost:3000
MCP_INTERNAL_TOKEN=your-token-here            # 与 .env 中保持一致
```

## Hermes MCP 配置

```json
{
  "mcpServers": {
    "tennis-platform": {
      "command": "node",
      "args": ["/path/to/tennis-platform/apps/mcp-server/dist/index.js"],
      "env": {
        "INTERNAL_API_BASE_URL": "http://your-api-domain",
        "MCP_INTERNAL_TOKEN": "your-token-here"
      }
    }
  }
}
```

## 测试阶段手动绑定

如果需要跳过绑定码流程，直接手动绑定：

```bash
# 1. 查找用户 ID
docker exec -it tennis-platform-postgres-1 psql -U dev -d tennis \
  -c "SELECT id, nickname, phone FROM users;"

# 2. 执行手动绑定
bash scripts/bind-hermes.sh <userId> <hermesId> [groupId]

# 示例
bash scripts/bind-hermes.sh cmplfryh9000eh49k4f4tz8h9 "wx_user_abc123" "group_xyz"
```

## hermesId 说明

`hermesId` 是 Hermes 在处理群消息时能获取到的发言者唯一标识。
具体格式取决于 Hermes 的实现，可能是：

- 微信内部用户ID
- Hermes 自己生成的会话ID
- 其他唯一标识

请在 Hermes 配置中确认如何获取并传递此标识。

## 用户绑定流程（生产环境）

1. 用户访问 `[PUBLIC_WEB_BASE_URL]/me`
2. 点击「生成绑定码」
3. 在微信群对 Hermes 说：「绑定 XXXXXX」
4. Hermes 调用 `verify_bind_code` 完成绑定
5. 后续自动识别身份

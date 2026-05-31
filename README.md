# 网球场地预订与匹配平台

Tennis Court Booking Platform — A self-hostable tennis court booking and player matching platform.

> 一套可私有化部署、可复制销售的网球场馆管理与预订平台

[![License](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0--mvp-blue.svg)](https://github.com)

---

## 功能特性 / Features

- **场地数字化管理** — 场馆、场地、价格、营业时间后台自助配置
- **C 端在线预订** — 球友自助浏览时段、预订包场，告别微信群@老板
- **招募局 + 段位匹配** — 自评网球段位，发起/加入招募局，发布前智能反向推荐
- **可视化日程看板** — 周/日视图，一眼掌握所有场地占用，颜色区分状态
- **AI 替身运营 (MCP)** — 通过 MCP 协议对接 OpenClaw/Hermes，以老板真人微信号接待客户
- **Docker 一键部署** — `docker compose up -d` 即可跑通全栈
- **移动端响应式** — 手机/平板/桌面端均可正常使用

*(截图占位)*

## 技术栈 / Tech Stack

| 层 Layer | 技术 Technology |
|-----------|-----------------|
| C 端网页 | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| B 端后台 | Next.js 14 + shadcn/ui + Tailwind CSS + TanStack Query |
| 后端 API | NestJS + TypeScript + Prisma ORM |
| MCP Server | TypeScript + @modelcontextprotocol/sdk |
| 数据库 | PostgreSQL 16 |
| 缓存/队列 | Redis 7 + BullMQ |
| 鉴权 | JWT (C 端) + iron-session (B 端) |
| 测试 | Vitest + Playwright |
| 部署 | Docker Compose + Nginx |

## 快速开始 / Quick Start

### 前置要求

- Docker & Docker Compose
- Node.js >= 20
- pnpm >= 9

### 1. 克隆项目

```bash
git clone <repo-url>
cd tennis-platform
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，必填项：
#   DATABASE_URL - 数据库连接串
#   REDIS_URL    - Redis 连接串
#   JWT_SECRET   - JWT 签名密钥（随机字符串）
```

### 3. 一键启动（Docker 生产模式）

```bash
docker compose up -d
```

### 4. 访问地址

| 服务 | 地址 |
|------|------|
| C 端 (球友) | http://localhost |
| B 端 (管理后台) | http://localhost:8080/admin |
| API | http://localhost/api |
| API 健康检查 | http://localhost/api/health |

### 5. 测试账号

| 角色 | 手机号 | 密码 |
|------|--------|------|
| 管理员 | 13800000000 | admin123 |

## 开发模式 / Development

```bash
# 安装依赖
pnpm install

# 一键启动开发模式（DB + API + 前端）
bash scripts/dev.sh

# 或手动分步启动
pnpm db:up                        # 启动 PostgreSQL + Redis
pnpm --filter @tennis/api dev     # API (port 3000)
pnpm --filter @tennis/web-admin dev      # 管理后台 (port 3001)
pnpm --filter @tennis/web-customer dev   # C 端 (port 3003)

# 运行测试
pnpm test                          # 单元测试
pnpm test:e2e                      # E2E 测试

# 代码质量
pnpm lint
pnpm typecheck
```

## 目录结构 / Project Structure

```
tennis-platform/
├── apps/
│   ├── web-customer/        # C 端网页 (Next.js)
│   ├── web-admin/           # B 端管理后台 (Next.js)
│   ├── api/                 # 后端 API (NestJS)
│   └── mcp-server/          # MCP Server (供 AI Agent 接入)
├── packages/
│   ├── shared-types/        # 共享 TypeScript 类型
│   ├── shared-utils/        # 共享工具函数
│   └── ui/                  # 共享 UI 组件
├── docs/
│   ├── PRD.md               # 产品需求文档
│   ├── plan.md              # 开发计划
│   ├── BACKLOG.md           # 已知问题
│   └── hermes-skill/        # Hermes 接入文档
├── prisma/
│   ├── schema.prisma        # 数据库 Schema
│   └── seed.ts              # 种子数据
├── docker/                   # Dockerfile 集
├── tests/e2e/               # Playwright E2E 测试
├── docker-compose.yml       # 生产环境部署
├── docker-compose.dev.yml   # 本地开发 (仅 DB/Redis)
├── docker-compose.prod.yml  # 远程服务器部署 (外部 DB)
└── DEPLOY.md                # 部署文档
```

## Hermes 接入说明 / Hermes Integration

本平台通过 MCP Server 对外暴露 9 个工具，供 OpenClaw / Hermes 等 AI Agent 调用，
实现微信端 AI 替身自动应答客户。

详细接入文档参见 [docs/hermes-skill/](docs/hermes-skill/)。

## 贡献指南 / Contributing

本项目目前不接受外部 PR。欢迎提交 Issue 反馈问题和建议。

## 许可证 / License

本项目采用 [CC BY-NC-ND 4.0](LICENSE) 许可证。

- ✅ 允许个人学习和非商业使用
- ❌ 禁止商业使用
- ❌ 禁止修改后再发布
- ❌ 禁止未经授权的商业部署

商业授权请联系：your-email@example.com

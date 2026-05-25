# Tennis Platform

网球场地预订与匹配平台 - Monorepo

## 项目结构

```
apps/
├── web-customer/   # C 端网页 (Next.js)
├── web-admin/      # B 端管理后台 (Next.js)
├── api/            # 后端 API (NestJS)
└── mcp-server/     # MCP Server
packages/
├── shared-types/   # 共享 TS 类型
├── shared-utils/   # 共享工具函数
└── ui/             # 共享 UI 组件
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发数据库
pnpm db:up

# 启动全部开发服务
pnpm dev
```

## 技术栈

- **前端**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **后端**: NestJS + TypeScript + Prisma
- **数据库**: PostgreSQL 16 + Redis 7
- **包管理**: pnpm workspace + Turborepo
- **部署**: Docker Compose

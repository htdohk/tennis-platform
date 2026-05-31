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

## 服务地址

| 环境 | C 端 | 管理后台 | API |
|------|------|---------|-----|
| 开发 | http://localhost:3003 | http://localhost:3001/admin | http://localhost:3000 |
| 生产 | http://localhost | http://localhost:8080/admin | http://localhost/api |

## 测试账号

| 角色 | 手机号 | 密码 | 段位 |
|------|--------|------|------|
| 管理员 | 13800000000 | admin123 | 3.0 |
| 测试用户 | 13900001111 | Test123456 | 3.5 |

## 快速开始

### 本地开发

```bash
# 安装依赖
pnpm install

# 一键启动开发模式（自动启动 DB + API + 前端）
pnpm dev:start

# 或手动分步启动
pnpm db:up                       # 启动 PostgreSQL + Redis
pnpm --filter @tennis/api start:dev      # API (port 3000)
pnpm --filter @tennis/web-admin dev      # 管理后台 (port 3001)
pnpm --filter @tennis/web-customer dev   # C 端 (port 3003)

# 停止开发服务
pnpm kill                        # 清理所有开发端口
pnpm db:down                     # 停止数据库
```

### Docker 生产部署

```bash
cp .env.example .env             # 编辑配置
pnpm docker:up                   # 构建并启动全部服务
pnpm docker:down                 # 停止全部服务
```

### 常用操作

```bash
pnpm db:reset                    # 重置数据库到初始状态
pnpm test:e2e                    # 运行 E2E 测试
pnpm prisma studio               # 数据库可视化
```

## 技术栈

- **前端**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **后端**: NestJS + TypeScript + Prisma
- **数据库**: PostgreSQL 16 + Redis 7
- **包管理**: pnpm workspace + Turborepo
- **部署**: Docker Compose

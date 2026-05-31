# CLAUDE.md - 项目宪法

> 给 Claude Code 阅读,定义本项目的工作约定。任何修改前请阅读本文档。

## 项目概览

本项目是一个网球场地预订与匹配平台,采用 monorepo 架构。

- **C 端**:网页(apps/web-customer),给球友使用
- **B 端**:网页(apps/web-admin),给老板/管理员使用
- **后端**:NestJS API(apps/api)
- **MCP Server**:apps/mcp-server,供 OpenClaw 等 Agent 接入
- **数据库**:PostgreSQL,Prisma ORM
- **缓存/队列**:Redis,BullMQ
- **包管理**:pnpm workspace,turbo

## 严格遵守的规则

1. **改动前先读 PRD 和分步开发计划**:
   - `docs/PRD.md`
   - `docs/plan.md`

2. **目录边界**:
   - 不在 apps/* 之间直接 import,要走 packages/*
   - 不在 packages/* 中引用 apps/*
   - 共享类型放 packages/shared-types
   - 共享纯函数放 packages/shared-utils

3. **代码风格**:
   - TypeScript strict 模式
   - 函数式优先,避免不必要的 class
   - 关键业务逻辑必须写单元测试
   - 测试用 vitest(单元) + Playwright(E2E)

4. **数据库改动**:
   - 修改 Prisma schema 后,必须 `pnpm prisma migrate dev --name <描述>`
   - 不允许手写 SQL migration

5. **API 约定**:
   - C 端 API 前缀:`/api/`
   - B 端 API 前缀:`/admin/`
   - MCP 内部 API 前缀:`/internal/`
   - 错误统一返回 `{ code, message, details? }`
   - 成功统一返回 `{ code: 0, data, message?: 'ok' }`

6. **环境变量**:
   - 任何新增的环境变量,同步更新 `.env.example` 并加中文注释
   - 不在代码中硬编码任何配置

7. **Git 提交**:
   - 每个 milestone 完成后立即提交
   - 提交消息格式:`feat(mX): 描述` / `fix(mX): 描述`
   - 测试不通过不提交

## 工作流

每接到一个 milestone:
1. 阅读 docs/plan.md 中该 milestone 的要求
2. 列出实现计划(可在对话中输出)
3. 实现代码
4. 跑测试 + lint + typecheck
5. 全部通过 → git commit
6. 输出本步总结 + 下一步预告

## 常用命令

```bash
# 开发
pnpm dev:start                    # 一键启动开发模式 (DB + API + 前端)
pnpm kill                         # 清理所有开发端口
pnpm dev                          # turbo 并行启动全部 dev 脚本
pnpm db:up                        # 启动 PG + Redis
pnpm db:down                      # 关闭

# Docker 部署
pnpm docker:up                    # 构建并启动生产环境
pnpm docker:down                  # 停止生产环境

# 数据库
pnpm db:reset                     # 重置数据库到初始状态
pnpm prisma migrate dev           # 应用 migration
pnpm prisma generate              # 重新生成 Prisma client
pnpm prisma studio                # 数据库可视化

# 测试
pnpm test                         # 跑全部单元测试
pnpm test:e2e                     # 跑 Playwright E2E 测试
pnpm --filter api test            # 跑 API 测试
pnpm --filter api test:e2e        # 跑 API e2e 测试
pnpm test:db                      # 跑 DB 连通性测试

# 代码质量
pnpm lint
pnpm typecheck
pnpm format

## 不要做的事
❌ 不要在没有完成测试的情况下提交代码
❌ 不要在 packages/* 中安装重量级依赖
❌ 不要绕过 PrismaService 直接连数据库
❌ 不要在 C 端 API 暴露 B 端能力
❌ 不要在代码注释中放任何密钥
❌ 不要修改 docs/PRD.md(需求变更先和用户讨论)
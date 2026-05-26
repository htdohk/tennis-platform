# Session Handoff Notes

> 生成时间: 2026-05-26
> 当前进度: M0-M8 全部完成，准备进入 M9

## 项目概览

网球场地预订与匹配平台 - Monorepo (pnpm workspace + Turborepo)

- **API**: NestJS (port 3000), Prisma + PostgreSQL + Redis + BullMQ
- **C端**: Next.js 16 (port TBD, M10)
- **B端**: Next.js 16 (port 3001), shadcn/ui + TanStack Query + react-hook-form + zod
- **MCP Server**: TypeScript (port TBD, M12)

## 当前进度: M8 已完成

B端管理后台基础页面已交付:
- `/admin/login` - 登录页 (独立于 AdminLayout, 用 Route Group (auth) 分离)
- `/admin` - Dashboard (4 cards: 今日订单/场地数/用户数/招募中)
- `/admin/venues` - 场馆 CRUD
- `/admin/courts` - 场地 CRUD + 维护期管理
- `/admin/prices` - 价格规则 CRUD
- `/admin/users` - 用户列表 + 编辑段位/封禁

## M8 关键决策记录

### 端口分配
- API: `localhost:3000`
- Web-Admin: `localhost:3001` (不是 3002)

### 登录页与 AdminLayout 分离
- 登录页使用 Route Group `app/admin/(auth)/login/page.tsx`
- AdminLayout 通过 `pathname === "/admin/login"` 判断跳过鉴权和侧边栏
- `app/admin/(auth)/layout.tsx` 是空壳 passthrough

### 环境变量管理
- 统一在根目录 `.env` 管理 (从 `.env.example` 复制)
- `turbo.json` 的 `globalEnv` 透传 `NEXT_PUBLIC_API_BASE_URL` 和 `NEXT_PUBLIC_BRAND_NAME`
- Web-admin 通过 `process.env.NEXT_PUBLIC_API_BASE_URL` 读取 API 地址

### API Client (lib/api.ts)
- `getToken()` 每次直接从 `localStorage.getItem("admin_token")` 读取 (不缓存)
- 401 处理: `/auth/` 路径 → `throw ApiError` (给登录表单 catch); 其余路径 → `window.location.href`
- 登录表单使用 react-hook-form 的 `form.handleSubmit(onSubmit)`, 自动阻止默认表单提交

### 数据获取
- TanStack Query (`staleTime: 30000, retry: 1`)
- 吐司通知: sonner

## 后端核心闭环 (M3-M7)

| 模块 | 关键点 |
|------|-------|
| Auth | JWT (C端) + AdminGuard (B端 JWT + role check) |
| 段位校验 | `IsValidTennisLevel` 自定义 validator: number + [1.0, 5.0] + `Math.round(v*10)%5===0` |
| 登录限流 | Redis `login_attempts:{phone}`, 5次/5分钟, RateLimitGuard 只读 + LocalStrategy 写 |
| 订单 | Prisma `$transaction` + `idx_unique_active_booking` 部分唯一索引 |
| 价格 | PriceCalculator: 按 DateType × TimeSlotType 匹配 PriceRule, 30min slot 累加 |
| 状态机 | `OrderStateMachine`: PENDING_CONFIRM→CONFIRMED→COMPLETED/CANCELLED |
| 招募局 | previewMatches: 段位区间整数法 (`Math.round(level*10)`) + 时段 `isSlotsOverlapping` |
| 招募截止 | BullMQ repeatable job (every 60s), 过期 → RECRUITING_EXPIRED + AuditLog + Notification |

## 数据模型

12 个实体: Venue, Court, CourtMaintenance, PriceRule, User, Order, RecruitPost, RecruitParticipant, McpApiKey, SystemConfig, AuditLog, Notification

关键约束: User.level CHECK (1.0-5.0, step 0.5), Order 时段 30min 对齐 CHECK, `idx_unique_active_booking` 部分唯一索引

## 已知问题 / BACKLOG

参考 `docs/BACKLOG.md`

- 价格计算跨价格区间场景需要完善
- 可用时段查询需增加营业时间校验
- 测试覆盖需要补充 (playwright E2E)

## 下一步: M9 - 可视化日程看板 + 订单管理

需要实现:
- `/admin/schedule` - 周/日视图, 30分钟颗粒度, 5色状态区分
- `/admin/orders` - 订单列表 + 筛选
- 空白格点击新建订单, 订单块点击查看/编辑
- 后端聚合接口 `/admin/schedule?from=&to=`

## 启动命令

```bash
# 开发环境
pnpm db:up                           # Postgres + Redis
pnpm --filter @tennis/api start:dev  # API (3000)
cd apps/web-admin && npx next dev --port 3001  # B端 (3001)

# 测试
pnpm --filter @tennis/api test       # 单元测试
pnpm --filter @tennis/api test:e2e   # E2E测试
pnpm typecheck && pnpm lint          # 静态检查
```

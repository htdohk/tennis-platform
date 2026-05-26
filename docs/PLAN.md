# 网球场地预订与匹配平台 - 分步开发计划

> **配套文档**: 《网球场地预订与匹配平台 - MVP 第一期 PRD》(docs/PRD.md)
> **目标**: 让 Claude Code 按顺序自动开发、自动测试、自动推进
> **开发模式**: 单 Agent 串行,monorepo 架构
> **总 Milestone 数**: 15 个(M0 ~ M14)

---

## 整体开发顺序与依赖图

```
M0 环境验证
  ↓
M1 项目脚手架(Monorepo + Docker dev env)
  ↓
M2 数据模型(Prisma schema + migration + seed)
  ↓
M3 后端基础设施(NestJS + 共享模块 + 健康检查)
  ↓
M4 后端核心模块(场馆/场地/价格/用户)
  ↓
M5 后端订单与预订(包场流程)
  ↓
M6 后端招募局(含反向推荐)
  ↓
M7 后端定时任务(招募截止扫描)
  ↓
M8 B 端管理后台(场馆/场地/价格/用户配置)
  ↓
M9 B 端可视化日程看板 + 订单管理
  ↓
M10 C 端网页(浏览/注册/登录/预订)
  ↓
M11 C 端招募局功能
  ↓
M12 MCP Server
  ↓
M13 生产部署 docker-compose + 文档
  ↓
M14 E2E 测试 + 最终验收
```

每个 milestone 完成后,Claude Code 应执行:
1. ✅ 跑通该 milestone 的验收测试
2. ✅ 检查 lint / typecheck
3. ✅ `git add . && git commit -m "feat(mX): ..."`
4. ✅ 输出本步总结 + 下一步预告

---

## 进度追踪

| Milestone | 状态 | 完成日期 | Commit |
|-----------|------|---------|--------|
| M0 环境验证 | ✅ | 2026-05-26 | - |
| M1 项目脚手架 | ✅ | 2026-05-26 | `5537c57` |
| M2 数据模型 | ✅ | 2026-05-26 | `84f8eba` |
| M3 后端基础设施 | ✅ | 2026-05-26 | `1b81f91` |
| M4 后端核心模块 | ✅ | 2026-05-26 | `1454b7c` |
| M5 订单与预订 | ✅ | 2026-05-26 | `17ae8b4` |
| M6 招募局 | ✅ | 2026-05-26 | `66cc038` |
| M7 定时任务 | ✅ | 2026-05-26 | `e0cc85b` |
| M8 B端管理后台 | ✅ | 2026-05-26 | `5397601` |
| M9 日程看板+订单管理 | ⏳ | - | - |
| M10 C端网页 | ⏳ | - | - |
| M11 C端招募局 | ⏳ | - | - |
| M12 MCP Server | ⏳ | - | - |
| M13 生产部署 | ⏳ | - | - |
| M14 E2E测试+验收 | ⏳ | - | - |

---

## M0 - 开发环境验证

### 目标
确认你本地的 M4 Mac + VS Code + Claude Code 插件具备开发条件,避免后续 milestone 因环境问题卡壳。

### 你需要执行的命令(在终端逐条运行)

```bash
# 1. 系统与架构确认
sw_vers                           # 应显示 macOS 版本
uname -m                          # 应显示 arm64 (M4 是 Apple Silicon)

# 2. Node.js (推荐 v20 LTS 或 v22)
node -v                           # 期望 >= v20.x
npm -v
# 如未安装,推荐用 fnm 或 nvm:
#   brew install fnm
#   fnm install 20 && fnm use 20

# 3. pnpm(monorepo 包管理器)
pnpm -v                           # 期望 >= 9.x
# 如未安装: npm i -g pnpm@latest

# 4. Docker Desktop(必备)
docker -v                         # 期望 >= 24.x
docker compose version            # 期望 >= 2.x
docker ps                         # 确认 daemon 在运行
# 如未安装: 从 https://www.docker.com/products/docker-desktop/ 下载 Apple Silicon 版

# 5. Git
git --version

# 6. VS Code 与 Claude Code 插件
code --version                    # 确认 VS Code CLI 可用
# Claude Code 插件:VS Code 扩展商店搜索 "Claude" 安装官方版

# 7. 可选但推荐
brew install gh                   # GitHub CLI
brew install jq                   # JSON 处理
brew install httpie               # API 调试
```

### 期望结果

- [ ] Node.js >= 20
- [ ] pnpm >= 9
- [ ] Docker Desktop 已运行
- [ ] Git 已配置 user.name 和 user.email
- [ ] VS Code 中 Claude Code 插件可正常对话

### 如果任意一项不通过

把报错信息发出来诊断后再进入 M1。

### 第一次 Claude Code 对话准备

环境就绪后,**新建一个空目录** `tennis-platform`,用 VS Code 打开,在该目录下创建 `docs/PRD.md` 和 `docs/plan.md`(本文档),然后打开 Claude Code 对话框,按 M1 的 prompt 启动。

---

## M1 - 项目脚手架

### 目标
搭建 monorepo 基础结构,启动本地 Docker 开发环境(Postgres + Redis)。

### 产出物

```
tennis-platform/
├── apps/
│   ├── web-customer/        # 空 Next.js 项目
│   ├── web-admin/           # 空 Next.js 项目
│   ├── api/                 # 空 NestJS 项目
│   └── mcp-server/          # 空 TypeScript 项目
├── packages/
│   ├── shared-types/        # 空包,导出 placeholder
│   ├── shared-utils/        # 空包
│   └── ui/                  # 空包
├── prisma/                  # 暂空
├── docker/                  # 暂空
├── docker-compose.dev.yml   # 启动 Postgres + Redis
├── .env.example
├── .gitignore
├── CLAUDE.md                # 项目宪法(见附录 A)
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── README.md
```

### 关键配置文件要点

- **`package.json`**: name "tennis-platform", private: true,scripts 含 dev/build/test/lint/typecheck/db:up/db:down
- **`pnpm-workspace.yaml`**: packages 包含 `apps/*` 和 `packages/*`
- **`turbo.json`**: 配置 dev/build/test/lint/typecheck pipeline
- **`CLAUDE.md`**: 内容见附录 A
- **`.env.example`**: 内容见附录 B

### 验收标准

```bash
pnpm install                      # 不报错
pnpm db:up                        # Postgres + Redis 启动
docker ps                         # 看到两个容器在运行
pnpm typecheck                    # 所有项目 typecheck 通过
pnpm lint                         # 通过
```

### Claude Code Prompt 模板(M1)

```
请按照 docs/plan.md 的 M1 章节,初始化整个 monorepo 项目脚手架。

具体要求:
1. 在当前目录初始化 pnpm workspace,创建上述目录结构
2. apps/web-customer 和 apps/web-admin 用 `create-next-app` 创建,启用 TypeScript + Tailwind CSS + App Router
3. apps/api 用 `@nestjs/cli new` 创建
4. apps/mcp-server 手动创建,package.json 含 typescript/tsx
5. packages/* 各创建 package.json + tsconfig + src/index.ts(空导出)
6. 在根目录创建 docker-compose.dev.yml,启动 postgres:16-alpine 和 redis:7-alpine
7. 创建 CLAUDE.md(内容见 docs/plan.md 附录 A)
8. 创建 .env.example(内容见 docs/plan.md 附录 B)
9. 配置 turbo.json,声明 dev/build/test/lint/typecheck 任务
10. 执行 pnpm install,执行 pnpm db:up,执行 pnpm typecheck,确认全部通过
11. git init && git add . && git commit -m "feat(m1): project scaffolding"

如有任何步骤报错,先修复再继续。完成后输出本步总结。
```

---

## M2 - 数据模型(Prisma)

### 目标
定义所有核心数据表的 Prisma schema,生成 migration 和种子数据。

### 产出物

- `prisma/schema.prisma` 完整 schema
- `prisma/migrations/0001_init/` migration 文件
- `prisma/seed.ts` 种子脚本(含 1 个场馆、4 片场地、默认价格、1 个老板账号)
- `packages/shared-types/` 导出 Prisma 生成的类型
- `apps/api/src/prisma/` Prisma Service 模块

### Prisma Schema 核心实体

按 PRD 第 5 章定义,关键约束:

```prisma
// 关键示例,完整 schema 由 Claude Code 根据 PRD 第 5 章展开

model Order {
  // ...
  // 同一场地、同一时段不能有两个活跃订单
  @@index([courtId, startAt, endAt])
}

model User {
  level Decimal @db.Decimal(2, 1) // 1.0 - 5.0, 步进 0.5
}
```

### 验收标准

```bash
pnpm prisma generate              # Prisma client 生成
pnpm prisma migrate dev --name init   # migration 应用成功
pnpm prisma db seed               # 种子数据写入成功
pnpm prisma studio                # 可视化看到数据
pnpm test:db                      # 简单连通性测试通过
```

### Claude Code Prompt 模板(M2)

```
请按照 docs/plan.md M2 和 docs/PRD.md 第 5 章,定义完整的 Prisma schema。

要求:
1. 在根目录 prisma/ 下创建 schema.prisma,定义所有实体:
   Venue / Court / CourtMaintenance / PriceRule / User / Order /
   RecruitPost / RecruitParticipant / McpApiKey / SystemConfig / AuditLog
2. 严格按 PRD 第 5 章字段定义,注意:
   - User.level 用 Decimal(2,1),范围 1.0-5.0
   - Order 时段 30 分钟对齐,DB 层加 CHECK 约束
   - 同一场地同一时段不能两个活跃订单(部分唯一索引)
3. 在 apps/api 中安装 prisma + @prisma/client,创建 PrismaModule + PrismaService
4. 在 packages/shared-types 中 re-export Prisma 类型
5. 编写 prisma/seed.ts:
   - 创建 1 个示例场馆 "测试网球馆"
   - 创建 4 片场地(2 室内硬地 + 2 室外硬地)
   - 创建默认价格规则
   - 创建 1 个老板账号(用户名 admin / 密码 admin123,bcrypt 加密)
6. 配置 package.json 的 prisma.seed 字段
7. 跑通:pnpm prisma migrate dev --name init && pnpm prisma db seed
8. 写一个简单的 DB 连通性测试(vitest),验证种子数据存在
9. git commit -m "feat(m2): data model and seed"
```

---

## M3 - 后端基础设施

### 目标
搭建 NestJS 后端基础设施层:配置、日志、异常、鉴权、共享工具。

### 产出物

- `apps/api/src/config/` 环境变量加载(@nestjs/config)
- `apps/api/src/common/` 全局异常过滤器、日志拦截器、响应包装
- `apps/api/src/auth/` JWT 鉴权(C 端)+ session 鉴权(B 端)
- `apps/api/src/health/` 健康检查 `/health`
- `packages/shared-utils/src/time-slot.ts` 时段计算工具
- 单元测试:time-slot、auth

### 验收标准

```bash
pnpm --filter api start:dev
curl http://localhost:3000/health     # 返回 {"status":"ok","db":"ok","redis":"ok"}
pnpm --filter api test                # 通过
pnpm --filter shared-utils test       # 通过
```

`time-slot.ts` 必须覆盖:
- ✅ 30 分钟对齐校验
- ✅ 时段重叠判断
- ✅ 时段时长计算
- ✅ 边界情况(同一时刻、跨日)

### Claude Code Prompt 模板(M3)

```
请按 docs/plan.md M3 实现后端基础设施。

要求:
1. apps/api 安装依赖:@nestjs/config, @nestjs/jwt, bcrypt, iron-session,
   @nestjs/terminus, helmet, class-validator, class-transformer
2. 创建 ConfigModule,从 .env 加载,提供强类型 ConfigService
3. 创建 AuthModule:JwtStrategy / SessionStrategy / LocalStrategy
4. 创建全局异常过滤器(统一错误响应格式)
5. 创建日志拦截器(结构化 JSON 输出)
6. 创建响应包装拦截器(统一返回 { code, data, message })
7. 创建 HealthModule,/health 检查 DB 和 Redis
8. 在 packages/shared-utils/src/time-slot.ts 实现:
   - isAlignedTo30Min(date: Date): boolean
   - getSlotDurationMinutes(start: Date, end: Date): number
   - isSlotsOverlapping(a, b): boolean
   - alignToNext30Min / alignToPrev30Min
9. 为 time-slot 写完整 vitest 测试,覆盖率 > 90%
10. 启动 API,curl /health 验证
11. git commit -m "feat(m3): backend infrastructure"
```

---

## M4 - 后端核心模块(场馆/场地/价格/用户)

### 目标
实现场馆、场地、价格、用户的 CRUD API,作为订单和招募的基础。

### API 端点(节选)

```
# C 端
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
PATCH  /api/users/me

# B 端
POST   /admin/auth/login
GET    /admin/venues
POST   /admin/venues
PATCH  /admin/venues/:id
GET    /admin/courts
POST   /admin/courts
PATCH  /admin/courts/:id
POST   /admin/courts/:id/maintenance
GET    /admin/prices
POST   /admin/prices
GET    /admin/users
PATCH  /admin/users/:id
```

### 验收标准

- ✅ 每个模块包含 Service 单元测试 + Controller 集成测试
- ✅ E2E 测试覆盖:注册 → 登录 → 改资料、管理员创建场馆场地

### Claude Code Prompt 模板(M4)

```
请按 docs/plan.md M4 实现后端核心模块。

要求:
1. 实现 4 个模块:venues / courts / prices / users
2. 每个模块包含:Module / Controller / Service / DTO(class-validator 校验)
3. C 端用 JwtAuthGuard,B 端用 SessionAuthGuard + RoleGuard
4. 注册接口校验:
   - 手机号格式
   - 段位 1.0-5.0 步进 0.5
   - 微信号必填
   - 密码 bcrypt 加密
5. 用户登录失败限流(同一手机号 5 次/5 分钟,用 Redis)
6. 每个模块写 service.spec.ts 单元测试(mock prisma)
7. 写 e2e 测试,覆盖:
   - 注册 → 登录 → 拿 token → 修改资料
   - 管理员登录 → 创建场馆 → 创建场地 → 列表查询
8. 跑通所有测试
9. git commit -m "feat(m4): venues/courts/prices/users modules"
```

---

## M5 - 后端订单与预订(包场流程)

### 目标
实现包场预订核心流程,含并发冲突防护。

### API 端点

```
GET    /api/courts/:id/availability?date=2026-06-01
POST   /api/orders                       # 创建包场订单
GET    /api/orders/me                    # 我的订单
GET    /api/orders/:id                   # 订单详情
GET    /admin/orders                     # 订单列表
PATCH  /admin/orders/:id/confirm
PATCH  /admin/orders/:id/cancel
PATCH  /admin/orders/:id/complete
PATCH  /admin/orders/:id/mark-paid
POST   /admin/orders                     # 后台手动新建
```

### 核心要点

- **并发冲突**:Prisma 事务 + DB 部分唯一索引,捕获冲突返回 409
- **时段校验**:30 分钟对齐 + 营业时间内 + 不与维护期冲突
- **价格计算**:根据 PriceRule 自动计算
- **状态机**:`PENDING_CONFIRM → CONFIRMED → COMPLETED` / `CANCELLED`

### 验收标准

测试必须覆盖:
- ✅ 正常预订
- ✅ 时段不对齐被拒绝
- ✅ 与已有订单冲突被拒绝(并发场景模拟)
- ✅ 营业时间外被拒绝
- ✅ 维护期内被拒绝
- ✅ 价格计算正确
- ✅ 老板可改签、取消、完成
- ✅ 已完成订单不能再修改

### Claude Code Prompt 模板(M5)

```
请按 docs/plan.md M5 实现订单与包场预订模块。

要求:
1. 创建 OrdersModule(Service + Controller + DTO)
2. 实现可用时段查询接口(基于营业时间 + 维护期 + 已有订单)
3. 实现下单接口,严格使用 Prisma 事务:
   - 校验时段 30 分钟对齐
   - 校验在营业时间内
   - 校验不与维护期冲突
   - 唯一约束冲突返回 409
4. 实现状态机(enum + 状态转移函数,非法转移抛错)
5. 价格计算 service,根据 PriceRule 计算
6. 写完整测试:
   - 单元测试:状态机、价格计算
   - 集成测试:并发下单冲突(Promise.all 模拟)
7. git commit -m "feat(m5): orders and booking flow"
```

---

## M6 - 后端招募局(含反向推荐)

### 目标
实现招募局核心功能 + 发布前反向推荐机制。

### API 端点

```
POST   /api/recruits/preview-matches    # 发布前查询匹配的招募 ⭐
POST   /api/recruits                    # 发布招募
GET    /api/recruits                    # 招募广场
GET    /api/recruits/:id
POST   /api/recruits/:id/join
POST   /api/recruits/:id/leave
PATCH  /api/recruits/:id/convert-to-normal
PATCH  /api/recruits/:id/abandon
GET    /admin/recruits
PATCH  /admin/recruits/:id/cancel
```

### 反向推荐查询逻辑

```
输入: { date, startAt, endAt, level, tolerance }
查询条件:
  - date 相同
  - 时段有重叠 (startAt < other.endAt AND endAt > other.startAt)
  - 段位区间有交集:
    [level-tolerance, level+tolerance] 与
    [other.level - other.tolerance, other.level + other.tolerance] 有交集
  - 状态 = RECRUITING
  - 未满员
返回:Top 5 按匹配度排序
```

### 加入招募时

- 检查段位在 target_level ± tolerance 范围内
- 检查未满员
- 满员后状态置为 `CONFIRMED`,推送通知

### 验收标准

- ✅ 反向推荐准确性(段位区间相交逻辑)
- ✅ 时段重叠逻辑
- ✅ 加入时段位校验
- ✅ 满员后自动转 CONFIRMED
- ✅ 转包场流程

### Claude Code Prompt 模板(M6)

```
请按 docs/plan.md M6 实现招募局模块。

要求:
1. 创建 RecruitsModule
2. 实现 previewMatches 接口(逻辑见 docs/plan.md M6 章节)
3. 实现 create:同时创建 Order(type=RECRUIT, status=RECRUITING)和 RecruitPost
4. 实现 join:
   - 校验加入者段位在 target_level ± tolerance 范围内
   - 校验未满员
   - 满员后将 Order 状态置为 CONFIRMED
5. 实现 convertToNormal 和 abandon(仅 RECRUITING_EXPIRED 状态可调用)
6. 段位区间相交工具函数提取到 shared-utils
7. 写测试,重点覆盖区间相交边界(相邻不相交、完全包含、部分相交)
8. git commit -m "feat(m6): recruit posts with reverse matching"
```

---

## M7 - 后端定时任务(招募截止扫描)

### 目标
实现招募截止时间扫描任务。

### 产出物

- `apps/api/src/jobs/` 任务模块(BullMQ)
- 招募截止任务:
  - 每分钟扫描截止已到且仍 RECRUITING 的招募
  - 状态置为 `RECRUITING_EXPIRED`
  - 写 AuditLog
  - 创建通知记录

### 验收标准

```
集成测试:
1. 创建一个截止时间 1 秒后的招募
2. 手动触发 scanner(或等待)
3. 验证状态变为 RECRUITING_EXPIRED
4. 验证生成通知记录
```

### Claude Code Prompt 模板(M7)

```
请按 docs/plan.md M7 实现定时任务模块。

要求:
1. 安装 bullmq + @nestjs/bullmq
2. 创建 JobsModule,配置 Redis 连接
3. 实现 RecruitExpireScanner:
   - 每分钟扫描截止已到且 RECRUITING 的招募
   - 事务内置为 RECRUITING_EXPIRED
   - 写 AuditLog
   - 创建 Notification 记录(字段:userId, type, content, isRead)
4. Notification 表若 M2 未建则补 migration
5. 写集成测试(1 秒后过期 + 手动触发 scanner)
6. git commit -m "feat(m7): recruit expiration scanner"
```

---

## M8 - B 端管理后台(基础配置)

### 目标
实现场馆/场地/价格/用户管理页面。

### 路由

- `/admin/login` 登录
- `/admin` Dashboard
- `/admin/venues`
- `/admin/courts`
- `/admin/prices`
- `/admin/users`

### 技术栈

Next.js + shadcn/ui + Tailwind + React Hook Form + Zod + TanStack Query + sonner(toast)

### 验收标准

- ✅ 完整走通:登录 → 新增场馆 → 新增场地 → 配置价格 → 看用户列表
- ✅ 表单校验完善
- ✅ 错误提示友好
- ✅ 响应式适配

### Claude Code Prompt 模板(M8)

```
请按 docs/plan.md M8 实现 B 端管理后台基础页面。

要求:
1. apps/web-admin 安装:shadcn/ui (npx shadcn@latest init),
   @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, sonner
2. 配置 API 客户端,统一处理 session cookie 和错误
3. 实现 /admin/login,登录后跳转 /admin
4. 实现 Dashboard /admin(今日订单数 / 场地数 / 用户数 卡片)
5. 实现 /admin/venues(列表 + 新增/编辑弹窗)
6. 实现 /admin/courts(列表 + 新增/编辑 + 维护期)
7. 实现 /admin/prices(列表 + 新增/编辑)
8. 实现 /admin/users(列表 + 编辑段位/封禁)
9. React Hook Form + Zod 做表单校验
10. 少量 Playwright E2E:登录 + 新增场馆
11. git commit -m "feat(m8): admin panel basic pages"
```

---

## M9 - B 端可视化日程看板 + 订单管理

### 目标
实现老板最关心的可视化日程看板。

### 路由

- `/admin/schedule` 日程看板(周/日视图)
- `/admin/orders` 订单列表
- `/admin/recruits` 招募管理

### 看板要点

- 周视图默认:横轴 7 天,纵轴 30 分钟时段
- 日视图:横轴所有场地,纵轴时段
- 点击空白格 → 新建订单弹窗
- 点击订单块 → 详情/编辑弹窗
- 5 种状态颜色区分

### 验收标准

- ✅ 单周数据 < 1s 加载完成
- ✅ 颜色清晰区分订单状态
- ✅ 移动端可基本浏览

### Claude Code Prompt 模板(M9)

```
请按 docs/plan.md M9 实现日程看板和订单管理。

要求:
1. /admin/schedule:
   - grid 布局画周/日视图,30 分钟一格
   - 周视图:7 列(日)× 多行(时段)
   - 日视图:N 列(场地)× 多行(时段)
   - 后端聚合接口 /admin/schedule?from=&to= 返回订单
   - Tailwind 颜色区分 5 种状态
2. 订单块点击 → Dialog 详情 + 操作按钮(确认/取消/完成/标记已付款)
3. 空白格点击 → Dialog 新建订单
4. /admin/orders 列表 + 筛选(状态、日期、用户、场地)
5. /admin/recruits 招募管理
6. 关键交互 Playwright E2E
7. git commit -m "feat(m9): visual schedule and order management"
```

---

## M10 - C 端网页(浏览/注册/登录/包场预订)

### 目标
实现 C 端球友的网页主流程。

### 路由

- `/` 首页
- `/venues/:id` 场馆详情
- `/booking` 预订页
- `/register` 注册
- `/login` 登录
- `/me` 个人中心
- `/me/orders` 我的订单
- `/orders/:id` 订单详情

### 验收标准

- ✅ 完整流程:浏览 → 看场馆 → 选时段 → 注册 → 下单 → 看订单
- ✅ 响应式适配手机
- ✅ 浏览免登录,下单强制登录

### Claude Code Prompt 模板(M10)

```
请按 docs/plan.md M10 实现 C 端网页。

要求:
1. apps/web-customer 同 web-admin 技术栈
2. /:展示品牌名(从 NEXT_PUBLIC_BRAND_NAME 读)、场馆 CTA、热门招募
3. /venues/:id 场馆详情
4. /booking:
   - 选场地 → 选日期(日历)→ 选时段(可点击 30 分钟格子连选)
   - 未登录时跳 /login?redirect=/booking
   - 成功跳 /orders/:id
5. /register 表单:手机号、密码、昵称、段位(滑动条 1.0-5.0 步进 0.5)、微信号、性别
6. /login
7. /me 和 /me/orders
8. /orders/:id 详情
9. JWT 存 localStorage(MVP)
10. 关键流程 Playwright E2E
11. git commit -m "feat(m10): customer web - browse/register/booking"
```

---

## M11 - C 端招募局功能

### 目标
实现招募完整流程,含反向推荐弹窗。

### 路由

- `/recruits` 招募广场
- `/recruits/:id` 招募详情
- `/recruits/new` 发起招募
- `/me/recruits` 我的招募

### 核心 UX

`/recruits/new` 填写完意图点"下一步"时,先调 `previewMatches`,有匹配则弹窗。

### 验收标准

- ✅ 完整流程:填意图 → 看反向推荐 → 加入对方/自己发布 → 广场可见 → 他人加入 → 满员转 CONFIRMED
- ✅ 反向推荐弹窗中微信号可一键复制
- ✅ 招募广场支持筛选

### Claude Code Prompt 模板(M11)

```
请按 docs/plan.md M11 实现 C 端招募功能。

要求:
1. /recruits 招募广场(卡片列表)
2. /recruits/new 发起招募:
   - 表单:场地、日期、时段、段位浮动(默认 ±0.5)、招募人数、截止时间
   - 提交前调 previewMatches,有匹配则弹窗
   - 弹窗:对方昵称、段位、微信号(带复制按钮)、招募进度
   - 用户选:"加入" / "仍然自己发布"
3. /recruits/:id 详情 + 加入/退出
4. /me/recruits 我的招募
5. RECRUITING_EXPIRED 状态显示决策按钮(转包场/放弃)
6. Playwright E2E:发起招募 → 看推荐 → 继续发布 → 另一用户加入
7. git commit -m "feat(m11): customer recruit flow with reverse matching"
```

---

## M12 - MCP Server

### 目标
实现 MCP Server,暴露 9 个工具供 OpenClaw 调用。

### 工具清单(对应 PRD 3.3)

- `query_courts`
- `query_available_slots`
- `query_user_by_wechat`
- `create_order`
- `query_user_orders`
- `cancel_order_request`
- `query_recruit_posts`
- `create_recruit_post`
- `notify_boss`

### 架构

MCP Server 独立进程,通过 HTTP 调用 API 的 `/internal/*` 端点(用 `X-Internal-Token` 鉴权),保持业务逻辑唯一来源。

### 验收标准

```bash
pnpm --filter mcp-server dev
npx @modelcontextprotocol/inspector node apps/mcp-server/dist/index.js
# 验证 9 个工具均可调用并返回正确数据
```

### Claude Code Prompt 模板(M12)

```
请按 docs/plan.md M12 实现 MCP Server。

要求:
1. apps/mcp-server 安装 @modelcontextprotocol/sdk
2. apps/api 新增 /internal/* 端点(对应 9 个工具),X-Internal-Token 鉴权
3. mcp-server 通过 HTTP 调用 /internal/*
4. 实现 9 个 MCP 工具(签名见 PRD 3.3)
5. 错误处理:HTTP 错误转 MCP 错误,返回友好消息
6. 编写 README 说明 OpenClaw 接入方式(配置文件示例)
7. MCP Inspector 手动验证每个工具
8. 简单集成测试(MCP Client SDK 调用)
9. git commit -m "feat(m12): mcp server"
```

---

## M13 - 生产部署 docker-compose + 文档

### 目标
完成生产部署配置,老板拿到代码 `docker compose up -d` 即可跑通。

### 产出物

- `docker/Dockerfile.api`(multi-stage)
- `docker/Dockerfile.web-customer`
- `docker/Dockerfile.web-admin`
- `docker/Dockerfile.mcp`
- `docker-compose.yml`(生产)
- `nginx.conf`(反向代理)
- `.env.example` 完整带注释
- `DEPLOY.md` 部署文档

### 验收标准

```bash
cp .env.example .env
docker compose build
docker compose up -d
docker compose ps                # 全部 healthy
curl http://localhost/health     # API 健康
curl http://localhost/           # C 端首页
curl http://localhost/admin/     # B 端后台
```

### Claude Code Prompt 模板(M13)

```
请按 docs/plan.md M13 完成生产部署配置。

要求:
1. api / web-customer / web-admin / mcp-server 各写 multi-stage Dockerfile
   - builder:pnpm install + build
   - runner:仅 dist + node_modules,最小镜像
2. docker-compose.yml:
   - postgres(数据卷)、redis(数据卷)
   - api、web-customer、web-admin、mcp-server
   - nginx(80/443)
   - 全部 healthcheck
3. nginx.conf:
   - / → web-customer
   - /admin → web-admin
   - /api → api
   - /mcp → mcp-server
4. .env.example 全变量 + 中文注释
5. DEPLOY.md:
   - 环境前置(Docker / 域名 / SSL)
   - 配置步骤
   - 启动命令
   - 升级流程
   - 备份与恢复
   - 常见问题
6. 本地完整跑通 docker compose up -d
7. git commit -m "feat(m13): production docker deployment"
```

---

## M14 - E2E 测试 + 最终验收

### 目标
补齐端到端测试,覆盖 PRD 第 11 章所有验收标准。

### 产出物

- `tests/e2e/` 跨端 E2E 测试套件
- 覆盖场景:
  1. 老板:登录 → 配置场馆/场地/价格 → 看板可见
  2. 球友:注册 → 浏览 → 包场下单 → 老板确认 → 完成
  3. 球友:发起招募 → 看反向推荐 → 自己发布 → 另一用户加入 → 满员转 CONFIRMED
  4. 球友:发起招募 → 超时未凑齐 → 收到通知 → 转包场
  5. MCP:模拟调用 query_available_slots + create_order → 订单可见

### 验收标准

PRD 第 11 章 10 条硬指标全部通过。

### Claude Code Prompt 模板(M14)

```
请按 docs/plan.md M14 完成 E2E 测试和最终验收。

要求:
1. tests/e2e 用 Playwright 实现 5 个核心场景
2. 测试可在 docker compose 环境下跑(用 baseURL)
3. 编写 RUNBOOK.md(如何执行测试和验收)
4. 对照 PRD 第 11 章 10 条标准逐条勾选
5. 输出最终验收报告 ACCEPTANCE_REPORT.md
6. git commit -m "feat(m14): e2e tests and acceptance"
7. git tag v1.0.0-mvp
```

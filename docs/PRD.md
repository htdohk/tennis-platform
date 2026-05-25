# 网球场地预订与匹配平台 - MVP 第一期 PRD

> **版本**: v1.0
> **日期**: 2026-05-25
> **状态**: 待评审
> **交付方式**: Docker 私有化部署,可复制销售给不同场馆老板

---

## 1. 项目背景与目标

### 1.1 项目背景

需求方为某网球场馆经营者,拥有十余片网球场地。当前业务痛点:

- **依赖人工登记**:场地时段管理依赖纸质或聊天记录
- **预订效率低**:用户通过微信群 @ 老板询问空闲时段,老板手动回复
- **私域沉淀好但难扩展**:老板个人微信号承载大量客户关系,无法机器化
- **匹配需求未满足**:零散用户找不到段位相近的球友组局,流失场地坪效

### 1.2 项目目标

打造一套**可私有化部署、可复制销售**的网球场馆管理与预订平台,实现:

1. **场地数字化管理**:可视化日程、电子化登记、场馆配置自助
2. **用户在线预订**:网页端自助下单,告别人工接待瓶颈
3. **AI 替身运营**:通过 MCP 协议对接 OpenClaw 等 Agent,以老板真人微信号接待客户,保持私域温度
4. **段位匹配机制**:解决"想打球但没队友"的核心痛点,提升场地利用率
5. **可复制交付**:Docker 一键部署,后续可作为标准化产品交付给其他场馆

### 1.3 MVP 阶段定位

- **验证核心闭环**:用户下单 → 场地占用 → 老板感知 → 到场打球
- **最快产出**:让甲方老板看到能跑通的产品
- **架构留好钩子**:支付、教练课、设备租赁、SaaS 化等未来需求预留扩展点

---

## 2. 用户角色与场景

### 2.1 C 端用户(球友)

**特征**:常在某球场打球的客户,有微信、可能在球场私域群里
**主要场景**:
- 在网页上浏览场馆和空闲时段
- 自助预订场地(包场)
- 发起或加入「招募局」,匹配段位相近的球友
- 通过微信群 @ 老板(AI 替身)咨询/下单
- 查看自己的订单和历史记录

### 2.2 老板 / 管理员

**特征**:场馆经营者本人,或场馆前台员工
**主要场景**:
- 在后台管理场馆、场地、营业时间、价格
- 查看可视化日程看板,一眼掌握所有场地占用情况
- 手动处理订单(确认、改签、取消、标记已付款)
- 配置 AI 替身相关参数(LLM Key、回应风格通过 OpenClaw 配置)
- 查看用户列表,必要时封禁

### 2.3 AI 替身(OpenClaw Agent + 老板真人微信)

**特征**:由老板侧使用 OpenClaw / Hermes 等工具操作真人微信账号,通过 MCP 协议调用本平台能力
**主要场景**:
- 群聊中以老板口吻应答用户咨询
- 用户在群里 @ 老板下单时,自动解析意图并创建订单
- 异常场景(无法理解、特殊请求)通知老板介入

> ⚠️ **责任边界**:本平台不交付 Agent 本体和微信操作逻辑,仅交付 MCP Server + 接入文档。微信账号操作的合规性由使用方自行承担。

---

## 3. 功能需求清单

### 3.1 C 端网页(球友)

#### 3.1.1 浏览(免登录)

- **首页**:场馆品牌介绍、场馆位置、当前活跃招募局推荐
- **场馆详情**:场馆图片、地址、设施介绍、规则
- **场地浏览**:展示该场馆下所有场地(场地类型、室内外等)
- **时段查询**:选择日期 → 可视化展示当日所有场地的占用情况(30 分钟颗粒度)
- **招募广场**:浏览所有进行中的招募局列表(日期、时段、段位要求、已加入人数)

#### 3.1.2 注册与登录

- 注册方式:手机号 + 验证码(MVP 暂用图形/邮箱验证码或固定 Mock,真实短信网关二期接入)
- 注册必填项:
  - 昵称
  - **网球段位自评**(1.0 ~ 5.0,步进 0.5,共 9 个档位)
  - 微信号(用于招募局展示,便于他人加微信群聊)
  - 性别(可选,影响双打匹配)
- 浏览免登录,下单时强制登录

#### 3.1.3 预订流程

**A. 包场预订**
1. 选择场馆 → 选择日期 → 选择场地 → 选择时段(支持跨多个 30 分钟段)
2. 填写预订信息(人数、备注)
3. 提交订单(状态: `PENDING_CONFIRM` 待老板确认)
4. 查看订单详情页(含订单号、二维码、状态)

**B. 招募局预订(核心差异化功能)** ⭐

1. 用户填写招募意图:日期、时段、段位浮动范围(默认 ±0.5)、招募人数、招募截止时间
2. **【发布前智能推荐】**:系统实时查询当前是否存在匹配的招募局
   - 匹配条件:日期相同 / 时段重叠 / 段位区间相交
   - 弹窗展示:对方昵称、段位、微信号、已招募进度
   - 用户可选:**"加入对方"** / **"仍然自己发布"**
3. 若发布:订单状态 `RECRUITING`,场地暂时占用
4. 其他用户在招募广场可发现并申请加入
5. **截止时间到达**:
   - 凑齐人数 → 订单状态 `CONFIRMED`
   - 未凑齐 → 订单状态 `RECRUITING_EXPIRED`,推送通知给发起人
   - 发起人可选:**"转为包场"** / **"放弃订单"**

#### 3.1.4 个人中心

- 我的资料(昵称、段位、微信号编辑)
- 我的订单(按状态分类:待确认 / 进行中 / 已完成 / 已取消 / 招募中 / 招募失效)
- 订单详情页
- 我发起的招募 / 我加入的招募

### 3.2 B 端管理后台(网页)

#### 3.2.1 登录与权限

- 角色:**老板**(全部权限) / **员工**(订单和日程权限,无配置权限)
- 登录方式:用户名 + 密码(MVP 阶段)
- MVP 不做复杂权限矩阵,只区分两个角色

#### 3.2.2 场馆管理

- 场馆列表(对私有化部署版本,通常只有 1 个场馆,但数据结构支持多个)
- 新增 / 编辑 / 停用场馆
- 场馆信息:名称、地址、图片、介绍、营业时间(默认)、联系方式

#### 3.2.3 场地管理

- 一个场馆下管理多片场地
- 场地属性:编号、名称、类型(室内/室外、硬地/红土/塑胶)、上下架状态
- 单片场地的特殊营业时间(覆盖场馆默认)
- 单片场地维护期(临时关闭某日某时段)

#### 3.2.4 价格管理

- 简单价格表:按"日期类型 × 时段"定价
  - 日期类型:工作日 / 周末 / 节假日
  - 时段类型:早场 / 日场 / 晚场(时段范围可配)
- MVP 不做会员价、不做动态定价

#### 3.2.5 可视化日程看板 ⭐ (老板最关心)

- **周视图**:横轴 7 天,纵轴 30 分钟时段,展示所有场地占用,颜色区分订单状态
- **日视图**:横轴所有场地,纵轴 30 分钟时段
- **快速操作**:点击空白时段 → 手动新建订单(为老朋友线下登记);点击订单块 → 查看/编辑/取消
- 不同状态颜色:
  - 待确认(黄)
  - 已确认(绿)
  - 招募中(蓝)
  - 已完成(灰)
  - 已取消(红色边框)

#### 3.2.6 订单管理

- 订单列表(筛选:状态、日期、用户、场地)
- 订单详情
- 操作:**确认订单 / 改签 / 取消 / 标记已付款 / 标记已完成**
- MVP 阶段所有取消由老板手动操作(用户端不直接取消)

#### 3.2.7 用户管理

- 用户列表(昵称、手机、段位、微信号、注册时间)
- 用户详情:历史订单、信用记录占位字段(二期用)
- 操作:封禁 / 解封
- 编辑用户段位(老板根据观察修正)

#### 3.2.8 招募局管理

- 当前所有招募局列表
- 老板可强制取消、强制确认、调整人数

#### 3.2.9 系统配置

- 场馆基本信息
- 营业时段默认规则
- 招募局默认浮动范围
- MCP Server 接入信息展示(API Key 等,供 OpenClaw 配置)

### 3.3 MCP Server(对接 OpenClaw / Hermes)

提供以下 MCP 工具供 Agent 调用:

| 工具名 | 功能 | 输入 | 输出 |
|--------|------|------|------|
| `query_courts` | 查询场地列表 | (可选)场馆 ID | 场地数组 |
| `query_available_slots` | 查询某日可用时段 | 日期、场地 ID(可选) | 时段数组(含已占用标记) |
| `query_user_by_wechat` | 通过微信号查询用户 | 微信号 | 用户信息或不存在 |
| `create_order` | 创建订单 | 用户标识、场地、时段、备注 | 订单 ID + 详情链接 |
| `query_user_orders` | 查询用户订单 | 用户标识、状态筛选 | 订单数组 |
| `cancel_order_request` | 申请取消订单(实际由老板确认) | 订单 ID、原因 | 通知已发送 |
| `query_recruit_posts` | 查询招募局 | 日期、段位范围 | 招募局数组 |
| `create_recruit_post` | 创建招募局 | 用户、场地、时段、段位浮动、截止时间 | 招募局 ID |
| `notify_boss` | 异常情况通知老板介入 | 消息内容、关联订单 | 已通知 |

> **认证机制**:MCP Server 通过 API Key 认证,老板在后台生成 Key 后配置到 OpenClaw 中。

> **群聊下单流程(对接 OpenClaw 后的最终用户体验)**:
> 1. 用户在微信群 @ 老板:"周六晚上 7 点想订 2 小时"
> 2. OpenClaw Agent 解析意图 → 调用 `query_available_slots`
> 3. Agent 以老板口吻回复:"周六晚上 7-9 点 3 号场有空,帮您订了哈"
> 4. Agent 调用 `create_order`
> 5. Agent 群里回复确认链接:"订单详情:https://xxx/orders/xxx"

### 3.4 段位匹配机制(详细说明)

#### 3.4.1 段位定义

- 数值范围:**1.0 ~ 5.0**,步进 **0.5**
- 用户自评(MVP 不验证)
- 老板可在后台手动修正用户段位

#### 3.4.2 匹配规则

- **基础匹配**:发起人段位 ± 浮动范围(默认 ±0.5,用户可调整为 ±1.0)
- **时段匹配**:招募时段与目标时段重叠 ≥ 30 分钟
- **日期匹配**:同一天

#### 3.4.3 反向推荐(发布前)

```
用户输入: 日期 2026-06-01, 时段 19:00-21:00, 段位 3.5±0.5

系统查询: 当天 18:30-21:30 范围内,段位区间 [2.5, 4.5] 与 [3.0, 4.0] 有交集的招募局

返回结果: 
  - 张三 (段位 3.5±0.5, 19:00-21:00, 已招 1/3, 微信号: zhangsan_wx)
  - 李四 (段位 4.0±0.5, 19:30-21:30, 已招 0/2, 微信号: lisi_wx)

用户决策:
  - "加入张三的招募" → 直接申请加入
  - "仍然自己发布" → 走原流程
```

---

## 4. 核心业务流程图(文字版)

### 4.1 包场预订流程

```
用户浏览场馆 → 选择日期场地时段 → 提交订单
                                     ↓
                                创建订单(PENDING_CONFIRM)
                                     ↓
                       MCP / 后台通知老板 → 老板确认 → CONFIRMED
                                                  ↓
                                              到场使用 → COMPLETED
```

### 4.2 招募局流程

```
用户填写招募意图
        ↓
   实时查询匹配
        ↓
有匹配? ──是──→ 弹窗展示 ──→ 加入对方招募 ──→ END
   ↓
   否
   ↓
发布招募(RECRUITING)
   ↓
其他用户加入 ──→ 凑齐人数? ──是──→ CONFIRMED ──→ 到场使用 ──→ COMPLETED
                    ↓
                    否
                    ↓
              到达截止时间
                    ↓
              RECRUITING_EXPIRED
                    ↓
        通知发起人:转包场 or 放弃
                    ↓
            转包场:CONFIRMED / 放弃:CANCELLED
```

### 4.3 群聊 @ 下单流程(经 OpenClaw)

```
用户在微信群 @ 老板真人号
        ↓
OpenClaw Agent 监听到 @ 消息
        ↓
LLM 解析意图(日期/时段/场地偏好)
        ↓
调用 MCP: query_available_slots
        ↓
若有空闲 → 调用 MCP: create_order → Agent 回复确认 + 详情链接
        ↓
若无空闲或意图不明 → 调用 MCP: notify_boss → 老板手动接管
```

---

## 5. 数据模型概览

### 5.1 核心实体

```
Venue (场馆)
  - id, name, address, intro, default_business_hours, contact, status

Court (场地)
  - id, venue_id, code, name, type, surface, status, special_hours
  
CourtMaintenance (场地维护期)
  - id, court_id, start_at, end_at, reason

PriceRule (价格规则)
  - id, venue_id, date_type, time_range, price_per_30min

User (用户)
  - id, phone, nickname, level, wechat_id, gender, status, role, created_at

Order (订单)
  - id, user_id, court_id, start_at, end_at, status, type(NORMAL/RECRUIT), 
    total_price, paid_status, notes, created_at
  - 唯一约束: (court_id, start_at, end_at) where status IN active states

RecruitPost (招募局)
  - id, order_id, target_level, level_tolerance, max_participants, 
    deadline, status
  
RecruitParticipant (招募参与者)
  - id, recruit_post_id, user_id, joined_at, status

McpApiKey (MCP 接入凭据)
  - id, key, name, scopes, last_used_at, status

SystemConfig (系统配置)
  - key, value, description

AuditLog (操作日志,预留)
  - id, actor_id, action, target, timestamp, payload
```

### 5.2 关键约束

- 订单时段唯一性:同一场地、同一时段不能有两个活跃订单(数据库唯一索引 + 事务)
- 段位精度:存储为 `numeric(2,1)`,范围 [1.0, 5.0]
- 时段对齐:订单 `start_at`、`end_at` 必须为 30 分钟整倍数(应用层校验 + DB CHECK)

---

## 6. 非功能需求

### 6.1 性能

- 时段查询接口 P95 < 300ms
- 可视化看板加载 < 1s(单周数据)
- 招募广场列表 < 500ms

### 6.2 安全

- 用户密码 bcrypt 加密
- API 鉴权:JWT Token(C 端用户)/ Session(管理后台)
- MCP Server 鉴权:API Key + IP 白名单(可选)
- 防刷:同一手机号注册限流、订单创建限流

### 6.3 可观测性

- 应用日志:结构化 JSON,输出到 stdout(便于 Docker logs)
- 关键操作记入 AuditLog
- 健康检查接口 `/health`

### 6.4 部署

- **Docker Compose 一键部署**
- 包含组件:
  - PostgreSQL 16
  - Redis 7(用于队列、招募截止定时任务、缓存)
  - 后端 API 服务(NestJS)
  - C 端网页(Next.js 静态导出 或 SSR)
  - B 端管理后台(Next.js)
  - MCP Server(独立服务或集成到后端)
  - Nginx(反向代理,可选)
- **环境变量配置**:
  ```env
  # 数据库
  DATABASE_URL=postgresql://user:pass@db:5432/tennis
  REDIS_URL=redis://redis:6379
  
  # JWT
  JWT_SECRET=xxx
  JWT_EXPIRES_IN=7d
  
  # 业务逻辑 LLM(意图识别等)
  BUSINESS_LLM_BASE_URL=https://api.deepseek.com/v1
  BUSINESS_LLM_API_KEY=sk-xxx
  BUSINESS_LLM_MODEL=deepseek-chat
  
  # (可选)如需更高级别 LLM 用于复杂解析,可配置第二组
  # ADVANCED_LLM_BASE_URL=...
  # ADVANCED_LLM_API_KEY=...
  # ADVANCED_LLM_MODEL=...
  
  # 品牌定制
  BRAND_NAME=XX网球馆
  BRAND_LOGO_URL=https://xxx
  
  # 前端访问地址(用于订单链接生成等)
  PUBLIC_WEB_BASE_URL=https://xxx
  
  # MCP Server
  MCP_SERVER_PORT=3100
  ```

### 6.5 跨平台

- 前端响应式适配(手机/平板/桌面)
- 后端纯 API 化,未来可扩展任意客户端(App、桌面端)
- 基础设施 Docker 化,Mac / Linux / 国内云均可部署

---

## 7. 技术架构与技术栈

### 7.1 技术选型

| 层 | 技术 | 说明 |
|----|------|------|
| C 端网页 | Next.js 14 (App Router) + TypeScript | SSR 友好,SEO 可选 |
| B 端后台 | Next.js 14 + shadcn/ui + Tailwind CSS | 现代化组件库,Claude Code 友好 |
| 后端 API | NestJS + TypeScript | 模块化清晰,适合 AI 辅助开发 |
| MCP Server | TypeScript + @modelcontextprotocol/sdk | 官方 SDK |
| 数据库 | PostgreSQL 16 | 时段查询、复杂关系处理强 |
| 缓存/队列 | Redis 7 + BullMQ | 招募截止定时任务、缓存 |
| ORM | Prisma | TypeScript 友好、迁移工具完善 |
| 鉴权 | JWT(C 端) + iron-session(B 端) | |
| 测试 | Vitest + Playwright | 单元测试 + E2E |
| 包管理 | pnpm workspace | Monorepo 依赖管理 |
| 任务编排 | Turborepo | monorepo 构建/测试任务 |
| 部署 | Docker Compose | 一键部署 |

### 7.2 项目结构(Monorepo)

```
tennis-platform/
├── apps/
│   ├── web-customer/        # C 端网页 (Next.js)
│   ├── web-admin/           # B 端管理后台 (Next.js)
│   ├── api/                 # 后端 API (NestJS)
│   └── mcp-server/          # MCP Server
├── packages/
│   ├── shared-types/        # 共享 TS 类型(基于 Prisma 生成 + DTO)
│   ├── shared-utils/        # 工具函数(时段计算等)
│   └── ui/                  # 共享 UI 组件(C 端 + B 端复用)
├── prisma/
│   └── schema.prisma        # 数据库 schema
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web-customer
│   ├── Dockerfile.web-admin
│   └── Dockerfile.mcp
├── docker-compose.yml       # 生产部署
├── docker-compose.dev.yml   # 本地开发(只启 DB/Redis)
├── .env.example
├── CLAUDE.md                # 项目宪法,给 Claude Code 看
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

### 7.3 模块抽象与扩展点

为未来功能预留接口:

- **PaymentProvider**(接口):MVP 仅实现 `OfflinePaymentProvider`(线下付款),二期接入微信支付时新增实现
- **NotificationChannel**(接口):MVP 仅实现 `WebPushChannel`,二期可加 `SmsChannel` / `WechatChannel`
- **LlmProvider**(接口):OpenAI 兼容的统一抽象,通过环境变量切换
- **OrderItem**(数据模型):订单项设计为多态,MVP 仅支持 `COURT_BOOKING` 类型,二期扩展 `COACHING` / `RENTAL`

---

## 8. 部署方案(Docker)

### 8.1 本地开发环境

```yaml
# docker-compose.dev.yml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: tennis
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["redisdata:/data"]

volumes:
  pgdata:
  redisdata:
```

应用层(API、Web)直接在本地 `pnpm dev` 运行,便于 Claude Code 热重载调试。

### 8.2 生产部署(老板侧)

```yaml
# docker-compose.yml
version: '3.9'
services:
  postgres: { image: postgres:16-alpine, ... }
  redis: { image: redis:7-alpine, ... }
  api: 
    build: { dockerfile: docker/Dockerfile.api }
    env_file: .env
    depends_on: [postgres, redis]
  web-customer:
    build: { dockerfile: docker/Dockerfile.web-customer }
    env_file: .env
  web-admin:
    build: { dockerfile: docker/Dockerfile.web-admin }
    env_file: .env
  mcp-server:
    build: { dockerfile: docker/Dockerfile.mcp }
    env_file: .env
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: ["./nginx.conf:/etc/nginx/nginx.conf"]
    depends_on: [api, web-customer, web-admin, mcp-server]
```

老板侧操作:
```bash
git clone <repo>
cp .env.example .env  # 填写自己的配置
docker compose up -d
```

---

## 9. MVP 范围边界(明确不做什么)

### ✅ MVP 第一期做

- 场馆/场地/价格基础管理
- 可视化日程看板
- C 端浏览/注册/包场预订
- 段位自评 + 招募局 + 反向推荐
- 后台订单管理
- MCP Server(供 OpenClaw 接入)
- Docker 私有化部署

### ❌ MVP 第一期不做

- 在线支付(只走线下,老板手动标记已付款)
- 用户端取消订单(由老板手动操作)
- 短信通知(用 Mock 或邮箱验证码)
- 段位认证 / 实战校准
- 拉黑用户
- 教练课程 / 设备租赁
- 数据报表 / BI 看板
- 周期性预订(常驻局)
- 天气联动
- 战绩排行榜 / 社交圈
- 半场预订
- SaaS 多租户后台(单独部署即可)
- 移动 App / 小程序

---

## 10. 后续版本路线图(占位)

### 二期(MVP 验证后)
- 微信支付接入(覆盖 PaymentProvider 抽象)
- 用户端取消 + 退款规则
- 短信通知接入
- 段位互评机制(招募局结束后参与者互评)
- 拉黑功能
- 数据报表(营收/上座率/热门时段)

### 三期
- 教练课程预订
- 设备租赁
- 周期性预订(常驻局模板)
- 天气联动(室外场雨天处理)
- 战绩与排行榜

### 远期
- 移动 App(Capacitor 打包)
- 多场馆 SaaS 化
- 跨场馆球友社交

---

## 11. 验收标准

MVP 验收通过的硬指标:

1. ✅ 老板可在后台完整管理场馆、场地、价格、营业时间
2. ✅ 老板可在可视化看板上一眼看到所有场地占用情况
3. ✅ 球友可在网页注册、自评段位、浏览空闲时段、提交包场订单
4. ✅ 球友可发起招募局,且发布前能看到匹配的已有招募
5. ✅ 招募局到期未凑齐能自动失效并通知发起人
6. ✅ 老板可手动确认/取消/标记完成订单
7. ✅ MCP Server 启动后,可被 OpenClaw 成功调用至少 5 个核心工具(查询时段、创建订单、查询订单、创建招募、通知老板)
8. ✅ `docker compose up -d` 一键启动全部服务,无需手工配置
9. ✅ 关键流程(预订/招募/MCP 调用)有自动化测试覆盖
10. ✅ `.env.example` 完整、文档清晰,新部署者照做即可跑通

---

## 附录 A:术语表

| 术语 | 含义 |
|------|------|
| MVP | Minimum Viable Product,最小可行产品 |
| MCP | Model Context Protocol,Anthropic 推出的 AI 工具协议 |
| OpenClaw / Hermes | 操作真人微信账号的 Agent 工具 |
| 招募局 | 用户发起的"招募球友凑场"的订单类型 |
| 段位 | 1.0 ~ 5.0 的网球水平自评分数 |
| 反向推荐 | 用户发布招募前,系统主动推荐已有匹配招募 |
| 私有化部署 | 软件部署在客户自己的服务器上,而非平台统一托管 |

## 附录 B:开放问题(后续讨论)

- [ ] 招募局凑齐人数的判定:是按报名人数,还是需要发起人确认?
- [ ] 用户微信号展示是否需要用户授权同意?(隐私合规)
- [ ] MCP Server 是否需要支持多个 Agent 并发(多个老板员工的 OpenClaw 同时接入)?
- [ ] 节假日定价规则的日期数据来源(手动配置 / 节假日 API)?

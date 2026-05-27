# 后续优化清单(非 MVP)

## 运维 / 可观测性
- [ ] Redis 连接配置优化:
  - lazyConnect: true
  - maxRetriesPerRequest: 3
  - 监听 'error' 事件做友好降级,避免大量 ECONNREFUSED 日志噪音
  - 来源:M3 验证时发现,优先级低
## 测试基础设施
- [ ] E2E 测试缺少数据清理机制,导致测试库有大量遗留数据
  - 建议:在每个 e2e spec 文件加 beforeEach/afterAll 清理
  - 或使用独立测试数据库 + 每次跑测试前 reset
  - 来源:M4 验证时观察到

## 前端集成
- [ ] GET /api/courts/:id/availability 返回格式只有 time(HH:MM),无完整 ISO 时间戳
  - 前端下单时需要自己拼 date + time → startAt/endAt
  - 建议 M10 实现前,让后端同时返回 startAt/endAt 完整时间戳,便于前端直接使用
  - 来源:M5 验证时发现

## 订单模块
- [ ] totalPrice 计算结果为 0,需排查价格规则匹配逻辑
  - 场地 cmplfryfd(A2) + 工作日 10:00-12:00 应有价格
  - 可能是 DateType 判断或场地-价格规则关联问题
  - 来源:M5 验证时发现,MVP 线下付款暂不影响流程

- [ ] 错误响应 details 字段暴露完整堆栈(文件路径+行号)
  - 生产环境需隐藏,只在开发环境显示
  - 在 GlobalExceptionFilter 中根据 NODE_ENV 判断是否暴露 stack
  - 来源:M5 状态机测试时发现,M13 部署配置时处理


## UI 细节
- [ ] 日程看板色块位置轻微偏移，起始位置超过整点时间横线约 2-4px
  - 原因：CSS top 计算逻辑需要微调（可能是 border/padding 未计入）
  - 影响：视觉轻微不精准，不影响功能
  - 来源：M9 验证时发现
## 营业时段管理（二期/独立 milestone）
- [ ] 支持多个营业时段（含午休断档），如 8:00-12:00 + 14:00-16:00
  - 数据模型：defaultBusinessHours 改为时段数组
  - 后端：下单时段校验逻辑改造（M5 现有逻辑需重写）
  - 后端：migration 兼容迁移现有单段数据
  - 前端：场馆编辑页支持动态增删时段
  - 前端：看板在午休断档时段渲染灰色"不营业"提示
  - 测试：补充多段时间边界用例
  - 优先级：MVP 后期 / 二期初期
  - 来源：M9 验证时用户提出

## M15（计划中）：认证体系升级
- [ ] 接入 better-auth 框架替换当前手写 JWT 方案
- [ ] 支持 OAuth 登录（微信/手机号/邮箱等，provider 在 .env 配置）
- [ ] 同一手机号/邮箱可绑定多个 OAuth provider（一对多）
- [ ] 手机号注册需短信验证码（接入短信供应商，如阿里云/腾讯云）
- [ ] 现有用户数据迁移方案
- [ ] 影响范围：apps/api/src/auth/ 全部重写 + 前端登录页改造
- [ ] 来源：M10 验证时用户提出，优先级：二期

## M11.5：招募段位体系后端改造（M12 前完成）

### 背景
当前后端用 targetLevel + levelTolerance（中心值±浮动）表示段位要求。
用户体验上应改为 minLevel + maxLevel（直接填最低最高），
前端换算会掩盖问题，应从后端根本改造。

### 后端改动
- [ ] Prisma migration：RecruitPost 表新增 min_level / max_level 字段
      废弃 target_level / level_tolerance（保留字段兼容旧数据，新数据用新字段）
- [ ] RecruitsService.create() DTO 改为接收 minLevel / maxLevel
- [ ] RecruitsService.previewMatches() 匹配逻辑：
      区间相交条件：max(min1,min2) <= min(max1,max2)
- [ ] RecruitsService.join() 段位校验：
      minLevel <= userLevel <= maxLevel
- [ ] 查询接口返回 minLevel / maxLevel 字段

### 前端改动（web-customer）
- [ ] /recruits/new：目标段位改为两个 Slider（minLevel/maxLevel）
      发起人段位不在范围内时显示黄色提示（不阻止发布）
- [ ] /recruits 广场卡片：显示「要求 X.X ~ Y.Y」
- [ ] /recruits/:id 详情：显示「段位要求：X.X ~ Y.Y」
- [ ] previewMatches 前端过滤改为用 minLevel/maxLevel 判断
- [ ] 草稿恢复补充 minLevel/maxLevel 字段

### 注意事项
- 旧数据兼容：已有招募的 targetLevel/levelTolerance 字段保留，
  查询时优先用新字段，新字段为空则 fallback 到旧字段换算
- 来源：M11 验证时用户提出，段位前端换算是掩盖问题

## Admin 补丁批次（M11.5 之后，M12 之前）
- [ ] Dashboard 场馆利用率热力图
      参考 GitHub 贡献图风格：深绿=满，浅绿=部分占用，红=需关注
      n 个场馆 × 7 列，2 小时一格，点击进入场馆日程周视图
- [ ] 日程看板顶部增加场馆 tab 切换（tab 允许换行）
- [ ] 场馆管理改为 2 列布局
- [ ] 场地管理增加场馆筛选器 + 删除场地（红色按钮，在维护期入口内）
- [ ] 价格管理增加场馆/场地筛选 + 支持编辑价格
- [ ] 管理员编辑用户：支持完整字段（手机号/性别/重置密码）
      重置密码逻辑：生成随机 8 位密码，bcrypt 加密存库，明文显示一次给管理员
- [ ] 客户端预订：过去时段置灰不可选 + 提交时验证时段有效性
- [ ] 用户端招募管理入口（/me 页面增加「我的招募」tab）
- [ ] 来源：M11 验证时用户提出

## M15：认证体系升级（二期）
- [ ] 接入 better-auth 框架
- [ ] 支持 OAuth 登录（微信/手机号/邮箱，provider 在 .env 配置）
- [ ] 同一手机号/邮箱可绑定多个 OAuth provider（一对多）
- [ ] 手机号注册需短信验证码
- [ ] 现有用户数据迁移方案

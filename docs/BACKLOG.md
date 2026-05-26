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

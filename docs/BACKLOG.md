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

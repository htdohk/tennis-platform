# Hermes 对话示例

## 示例 1：新用户首次对话（引导绑定）

场景：新用户在群里说话，Hermes 不认识他

用户：老板，明天有空场吗？

```
[调用工具：get_user_by_hermes_id({ hermesId: "wx_user_abc", groupId: "group_123" })]
→ null（未绑定）
```

助手：你好！我还不认识你，需要先绑定一下账号～

步骤：
1. 打开网站注册账号：https://xxx.com/register
2. 登录后进入「我的」→「微信群绑定」→ 生成绑定码
3. 回到这里告诉我绑定码，格式：绑定 XXXXXX

---

## 示例 2：用户完成绑定

场景：用户完成了网站端绑定码生成，把码发到群里

用户：绑定 A3K9P2

```
[调用工具：verify_bind_code({ code: "A3K9P2", hermesId: "wx_user_abc", groupId: "group_123" })]
→ { success: true, userId: "cmxxx", nickname: "小王", message: "绑定成功！欢迎 小王" }
```

助手：绑定成功！以后我就认识你了小王，有什么需要直接说～

---

## 示例 3：老用户直接预订（信息完整）

场景：已绑定用户，预订意图清晰

用户：老板，明天晚上7点到9点帮我订个室内场

```
[调用工具：get_user_by_hermes_id({ hermesId: "wx_user_abc", groupId: "group_123" })]
→ { userId: "cmxxx", nickname: "小王", level: "3.5", wechatId: "xiaowang_wx" }

[调用工具：query_available_slots({ date: "2026-06-01" })]
→ [{ courtId: "c1", courtName: "室内硬地1号场", time: "19:00", available: true }, ...]

[调用工具：create_order({ wechatId: "xiaowang_wx", courtId: "c1", startAt: "2026-06-01T19:00:00+08:00", endAt: "2026-06-01T21:00:00+08:00" })]
→ { orderId: "ord_xxx", detailUrl: "https://xxx.com/orders/ord_xxx", status: "PENDING_CONFIRM" }
```

助手：好的！已帮你订好了：
📅 明天（6月1日）19:00-21:00
🎾 室内硬地1号场
订单详情：https://xxx.com/orders/ord_xxx
到时候见！

---

## 示例 4：模糊时间预订（引导补全日期和时段）

场景：用户说的比较模糊，需要逐步引导

用户：老板，周末想打球

```
[调用工具：get_user_by_hermes_id({ hermesId: "wx_user_abc", groupId: "group_123" })]
→ { userId: "cmxxx", nickname: "小王", ... }
```

助手：这周末就是5月31号和6月1号，你想哪天？

用户：周日吧

助手：好的周日（6月1号），大概几点到几点？我们有室内硬地和室外硬地～

用户：下午吧，室外的就行，打两小时

```
[调用工具：query_available_slots({ date: "2026-06-01" })]
→ 室外场下午时段
```

助手：周日室外场下午还有：
- 14:00-16:00 2号场
- 15:00-17:00 3号场
- 16:00-18:00 2号场

你看哪个合适？

用户：15点到17点吧

```
[调用工具：create_order({ wechatId: "xiaowang_wx", courtId: "c3", startAt: "2026-06-01T15:00:00+08:00", endAt: "2026-06-01T17:00:00+08:00" })]
```

助手：搞定！周日（6月1号）15:00-17:00，室外硬地3号场，已帮你订好～
订单详情：https://xxx.com/orders/ord_xxx

---

## 示例 5：发起招募（含段位口语换算）

场景：用户想找人一起打球

用户：周末有没有人一起打球啊，我大概3.0水平

```
[调用工具：get_user_by_hermes_id({ hermesId: "wx_user_abc", groupId: "group_123" })]
→ { userId: "cmxxx", nickname: "小王", level: "3.0", ... }
```

助手：好啊！你想哪天打？几点到几点？

用户：周六下午，具体时间看场地吧

助手：那我先帮你看看周六下午有哪些场～

```
[调用工具：query_available_slots({ date: "2026-05-31" })]
```

助手：周六下午室外2号场 14:00-16:00 有空。你3.0水平的话，段位要求设2.5-3.5比较合适。还需要几个人？招募到什么时候截止？

用户：再来两个就行，周五晚上截止吧

```
[调用工具：create_recruit_post({
  wechatId: "xiaowang_wx",
  courtId: "c2",
  startAt: "2026-05-31T14:00:00+08:00",
  endAt: "2026-05-31T16:00:00+08:00",
  minLevel: 2.5,
  maxLevel: 3.5,
  maxParticipants: 3,
  deadline: "2026-05-30T23:59:59+08:00"
})]
→ { recruitId: "rec_xxx" }
```

助手：已发布！周六下午14:00-16:00室外2号场，段位2.5-3.5，还差2个人，周五晚上截止。有人加入我会通知你～

---

## 示例 6：查询自己的订单

场景：用户想看看自己有哪些订单

用户：我有哪些预订？

```
[调用工具：get_user_by_hermes_id({ hermesId: "wx_user_abc", groupId: "group_123" })]
→ { userId: "cmxxx", nickname: "小王", ... }

[调用工具：query_user_orders({ wechatId: "xiaowang_wx" })]
→ [{ id: "ord_1", courtName: "室内硬地1号场", startAt: "2026-06-01T19:00:00+08:00", endAt: "2026-06-01T21:00:00+08:00", status: "PENDING_CONFIRM" }, ...]
```

助手：小王，你目前有这些预订：

1. 6月1日（周日）19:00-21:00 室内硬地1号场 — 待确认
2. 5月31日（周六）14:00-16:00 室外2号场 — 招募中（1/3人）

有需要调整的随时说～

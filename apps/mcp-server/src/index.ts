import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.INTERNAL_API_BASE_URL || "http://localhost:3000";
const INTERNAL_TOKEN = process.env.MCP_INTERNAL_TOKEN || "change-this-internal-token";

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": INTERNAL_TOKEN,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as Record<string, unknown>).message ||
      (body as Record<string, unknown>).code ||
      `HTTP ${res.status}`;
    throw new Error(String(message));
  }

  const json = await res.json();
  // Unwrap unified response wrapper: { code: 0, data: ... }
  if (
    typeof json === "object" &&
    json !== null &&
    "code" in json &&
    "data" in json
  ) {
    return json.data as T;
  }
  return json as T;
}

function formatOrderDetailUrl(orderId: string): string {
  const baseUrl =
    process.env.PUBLIC_WEB_BASE_URL || "http://localhost:3001";
  return `${baseUrl}/orders/${orderId}`;
}

const server = new McpServer({
  name: "tennis-platform",
  version: "1.0.0",
});

// ─── Tool 1: query_courts ───
server.tool(
  "query_courts",
  "查询场地列表，返回所有可用场地的ID、名称、类型、表面、状态和所属场馆名称",
  {},
  async () => {
    const courts = await apiFetch<
      {
        id: string;
        name: string;
        type: string;
        surface: string;
        status: string;
        venueName: string;
      }[]
    >("/internal/courts");
    return {
      content: [{ type: "text", text: JSON.stringify(courts, null, 2) }],
    };
  },
);

// ─── Tool 2: query_available_slots ───
server.tool(
  "query_available_slots",
  "查询指定日期的可用时段，输入日期(YYYY-MM-DD格式)和可选的场地ID，返回每个场地的时段数组（含courtId/courtName/time/available）",
  {
    date: z
      .string()
      .describe("查询日期，格式为 YYYY-MM-DD，例如 2026-07-01"),
    courtId: z
      .string()
      .optional()
      .describe("可选，场地ID，不传则返回所有场地的可用时段"),
  },
  async (args) => {
    const params = new URLSearchParams({ date: args.date });
    if (args.courtId) params.set("courtId", args.courtId);
    const slots = await apiFetch<
      {
        courtId: string;
        courtName: string;
        time: string;
        available: boolean;
        reason?: string;
      }[]
    >(`/internal/courts/availability?${params.toString()}`);
    return {
      content: [{ type: "text", text: JSON.stringify(slots, null, 2) }],
    };
  },
);

// ─── Tool 3: query_user_by_wechat ───
server.tool(
  "query_user_by_wechat",
  "通过微信号查询用户信息，返回用户ID、昵称、段位、手机号等信息，若不存在则返回错误",
  {
    wechatId: z.string().describe("用户的微信号"),
  },
  async (args) => {
    const user = await apiFetch<{
      id: string;
      nickname: string;
      level: string;
      phone: string;
      wechatId: string;
      gender: string | null;
      status: string;
    }>(`/internal/users/by-wechat?wechatId=${encodeURIComponent(args.wechatId)}`);
    return {
      content: [{ type: "text", text: JSON.stringify(user, null, 2) }],
    };
  },
);

// ─── Tool 4: create_order ───
server.tool(
  "create_order",
  "为用户创建预订订单，输入微信号、场地ID、开始时间(ISO8601)、结束时间(ISO8601)和可选备注，返回订单ID和详情链接",
  {
    wechatId: z.string().describe("用户的微信号"),
    courtId: z.string().describe("场地ID"),
    startAt: z.string().describe("开始时间，ISO8601 格式，例如 2026-07-01T10:00:00Z"),
    endAt: z.string().describe("结束时间，ISO8601 格式，例如 2026-07-01T12:00:00Z"),
    notes: z.string().optional().describe("可选，订单备注"),
  },
  async (args) => {
    const result = await apiFetch<{
      orderId: string;
      detailUrl: string;
      status: string;
    }>("/internal/orders", {
      method: "POST",
      body: JSON.stringify({
        wechatId: args.wechatId,
        courtId: args.courtId,
        startAt: args.startAt,
        endAt: args.endAt,
        notes: args.notes,
      }),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ─── Tool 5: query_user_orders ───
server.tool(
  "query_user_orders",
  "查询用户的所有订单，输入微信号和可选的状态筛选，返回订单数组（含场地/时段/状态/价格）",
  {
    wechatId: z.string().describe("用户的微信号"),
    status: z
      .enum([
        "PENDING_CONFIRM",
        "CONFIRMED",
        "COMPLETED",
        "CANCELLED",
        "RECRUITING",
        "RECRUITING_EXPIRED",
      ])
      .optional()
      .describe(
        "可选，订单状态筛选：PENDING_CONFIRM(待确认), CONFIRMED(已确认), COMPLETED(已完成), CANCELLED(已取消), RECRUITING(招募中), RECRUITING_EXPIRED(招募过期)",
      ),
  },
  async (args) => {
    const params = new URLSearchParams({ wechatId: args.wechatId });
    if (args.status) params.set("status", args.status);
    const orders = await apiFetch<
      {
        id: string;
        courtId: string;
        courtName: string;
        venueName: string;
        startAt: string;
        endAt: string;
        status: string;
        type: string;
        totalPrice: string;
        paidStatus: string;
        notes: string;
        createdAt: string;
      }[]
    >(`/internal/orders?${params.toString()}`);
    return {
      content: [{ type: "text", text: JSON.stringify(orders, null, 2) }],
    };
  },
);

// ─── Tool 6: cancel_order_request ───
server.tool(
  "cancel_order_request",
  "申请取消订单（不会直接取消，而是通知老板介入处理），输入订单ID和取消原因",
  {
    orderId: z.string().describe("订单ID"),
    reason: z.string().describe("取消原因"),
  },
  async (args) => {
    const result = await apiFetch<{ notified: boolean }>(
      `/internal/orders/${args.orderId}/cancel-request`,
      {
        method: "POST",
        body: JSON.stringify({ reason: args.reason }),
      },
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { notified: result.notified, message: "已通知老板处理取消申请" },
            null,
            2,
          ),
        },
      ],
    };
  },
);

// ─── Tool 7: query_recruit_posts ───
server.tool(
  "query_recruit_posts",
  "查询招募局列表，可按日期和段位范围筛选，返回招募局数组（含发起人/场地/时段/段位要求/人数/截止时间）",
  {
    date: z
      .string()
      .optional()
      .describe("可选，筛选日期，格式 YYYY-MM-DD"),
    minLevel: z
      .number()
      .min(1)
      .max(5)
      .optional()
      .describe("可选，最低段位要求"),
    maxLevel: z
      .number()
      .min(1)
      .max(5)
      .optional()
      .describe("可选，最高段位要求"),
  },
  async (args) => {
    const params = new URLSearchParams();
    if (args.date) params.set("date", args.date);
    if (args.minLevel !== undefined)
      params.set("minLevel", String(args.minLevel));
    if (args.maxLevel !== undefined)
      params.set("maxLevel", String(args.maxLevel));
    const recruits = await apiFetch<
      {
        id: string;
        orderId: string;
        initiator: {
          id: string;
          nickname: string;
          level: string;
          wechatId: string;
        };
        courtId: string;
        courtName: string;
        venueName: string;
        startAt: string;
        endAt: string;
        minLevel: number;
        maxLevel: number;
        maxParticipants: number;
        currentParticipants: number;
        deadline: string;
        status: string;
        createdAt: string;
      }[]
    >(`/internal/recruits?${params.toString()}`);
    return {
      content: [{ type: "text", text: JSON.stringify(recruits, null, 2) }],
    };
  },
);

// ─── Tool 8: create_recruit_post ───
server.tool(
  "create_recruit_post",
  "创建招募局，输入微信号、场地ID、开始/结束时间、段位最低/最高要求、最大参与人数和截止时间，返回招募局ID",
  {
    wechatId: z.string().describe("发起人的微信号"),
    courtId: z.string().describe("场地ID"),
    startAt: z.string().describe("开始时间，ISO8601 格式，例如 2026-07-01T19:00:00Z"),
    endAt: z.string().describe("结束时间，ISO8601 格式，例如 2026-07-01T21:00:00Z"),
    minLevel: z
      .number()
      .min(1)
      .max(5)
      .describe("最低段位要求，范围 1.0 ~ 5.0"),
    maxLevel: z
      .number()
      .min(1)
      .max(5)
      .describe("最高段位要求，范围 1.0 ~ 5.0，须 >= minLevel"),
    maxParticipants: z
      .number()
      .int()
      .min(1)
      .describe("最大参与人数（含发起人）"),
    deadline: z
      .string()
      .describe("招募截止时间，ISO8601 格式"),
    notes: z.string().optional().describe("可选，备注"),
  },
  async (args) => {
    const result = await apiFetch<{ recruitId: string }>(
      "/internal/recruits",
      {
        method: "POST",
        body: JSON.stringify({
          wechatId: args.wechatId,
          courtId: args.courtId,
          startAt: args.startAt,
          endAt: args.endAt,
          minLevel: args.minLevel,
          maxLevel: args.maxLevel,
          maxParticipants: args.maxParticipants,
          deadline: args.deadline,
          notes: args.notes,
        }),
      },
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ─── Tool 9: notify_boss ───
server.tool(
  "notify_boss",
  "通知老板介入处理异常情况，消息将记录到 AuditLog 并创建系统通知，可选关联订单ID和附加上下文",
  {
    message: z.string().describe("通知消息内容"),
    orderId: z.string().optional().describe("可选，关联的订单ID"),
    context: z
      .string()
      .optional()
      .describe("可选，额外上下文信息"),
  },
  async (args) => {
    const result = await apiFetch<{ notified: boolean }>(
      "/internal/notify",
      {
        method: "POST",
        body: JSON.stringify({
          message: args.message,
          orderId: args.orderId,
          context: args.context,
        }),
      },
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { notified: result.notified, message: "已通知老板" },
            null,
            2,
          ),
        },
      ],
    };
  },
);

// ─── Start ───
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stderr is used for logging in stdio-based MCP servers (stdout is for protocol messages)
  console.error(`Tennis MCP Server started, API base: ${API_BASE}`);
}

main().catch((err) => {
  console.error("Failed to start MCP Server:", err);
  process.exit(1);
});

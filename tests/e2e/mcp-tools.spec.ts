import { test, expect } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("MCP query_courts 返回场地列表", async () => {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["apps/mcp-server/dist/index.js"],
    env: {
      INTERNAL_API_BASE_URL: "http://localhost:3000",
      MCP_INTERNAL_TOKEN: process.env.MCP_INTERNAL_TOKEN || "change-this-internal-token",
      PUBLIC_WEB_BASE_URL: "http://localhost:3003",
    },
  });

  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(transport);

  try {
    const result = await client.callTool({
      name: "query_courts",
      arguments: {},
    });

    expect(result.content[0].type).toBe("text");
    const courts = JSON.parse((result.content[0] as { text: string }).text);
    expect(Array.isArray(courts)).toBe(true);
    expect(courts.length).toBeGreaterThan(0);
    expect(courts[0]).toHaveProperty("name");
    expect(courts[0]).toHaveProperty("type");
    expect(courts[0]).toHaveProperty("venueName");
  } finally {
    await client.close();
  }
});

test("MCP query_available_slots 返回可用时段", async () => {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["apps/mcp-server/dist/index.js"],
    env: {
      INTERNAL_API_BASE_URL: "http://localhost:3000",
      MCP_INTERNAL_TOKEN: process.env.MCP_INTERNAL_TOKEN || "change-this-internal-token",
      PUBLIC_WEB_BASE_URL: "http://localhost:3003",
    },
  });

  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(transport);

  try {
    // Query availability for tomorrow to ensure no conflicts
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    const result = await client.callTool({
      name: "query_available_slots",
      arguments: { date: dateStr },
    });

    expect(result.content[0].type).toBe("text");
    const slots = JSON.parse((result.content[0] as { text: string }).text);
    expect(Array.isArray(slots)).toBe(true);
    // Each slot should have courtId, time, available fields
    if (slots.length > 0) {
      expect(slots[0]).toHaveProperty("courtId");
      expect(slots[0]).toHaveProperty("time");
      expect(slots[0]).toHaveProperty("available");
    }
  } finally {
    await client.close();
  }
});

test("MCP query_user_by_wechat 查询用户", async () => {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["apps/mcp-server/dist/index.js"],
    env: {
      INTERNAL_API_BASE_URL: "http://localhost:3000",
      MCP_INTERNAL_TOKEN: process.env.MCP_INTERNAL_TOKEN || "change-this-internal-token",
      PUBLIC_WEB_BASE_URL: "http://localhost:3003",
    },
  });

  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(transport);

  try {
    // The boss user from seed has wechatId "boss_wechat"
    const result = await client.callTool({
      name: "query_user_by_wechat",
      arguments: { wechatId: "boss_wechat" },
    });

    expect(result.content[0].type).toBe("text");
    const user = JSON.parse((result.content[0] as { text: string }).text);
    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("nickname");
    expect(user).toHaveProperty("wechatId", "boss_wechat");
  } finally {
    await client.close();
  }
});

test("MCP notify_boss 发送通知", async () => {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["apps/mcp-server/dist/index.js"],
    env: {
      INTERNAL_API_BASE_URL: "http://localhost:3000",
      MCP_INTERNAL_TOKEN: process.env.MCP_INTERNAL_TOKEN || "change-this-internal-token",
      PUBLIC_WEB_BASE_URL: "http://localhost:3003",
    },
  });

  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(transport);

  try {
    const result = await client.callTool({
      name: "notify_boss",
      arguments: {
        message: "E2E 测试通知消息",
        context: "playwright test",
      },
    });

    expect(result.content[0].type).toBe("text");
    const resp = JSON.parse((result.content[0] as { text: string }).text);
    expect(resp).toHaveProperty("notified", true);
  } finally {
    await client.close();
  }
});

test("MCP query_recruit_posts 查询招募列表", async () => {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["apps/mcp-server/dist/index.js"],
    env: {
      INTERNAL_API_BASE_URL: "http://localhost:3000",
      MCP_INTERNAL_TOKEN: process.env.MCP_INTERNAL_TOKEN || "change-this-internal-token",
      PUBLIC_WEB_BASE_URL: "http://localhost:3003",
    },
  });

  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(transport);

  try {
    const result = await client.callTool({
      name: "query_recruit_posts",
      arguments: {},
    });

    expect(result.content[0].type).toBe("text");
    const recruits = JSON.parse((result.content[0] as { text: string }).text);
    expect(Array.isArray(recruits)).toBe(true);
    // May be empty if no recruits exist, that's fine
  } finally {
    await client.close();
  }
});

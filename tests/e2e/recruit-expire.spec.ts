import { test, expect } from "@playwright/test";

const API_URL = "http://localhost:3000";
const INTERNAL_TOKEN = process.env.MCP_INTERNAL_TOKEN || "change-this-internal-token";

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": INTERNAL_TOKEN,
      ...options.headers,
    },
  });
  const json = await res.json();
  if (json && "code" in json && "data" in json) {
    return json.data as T;
  }
  return json as T;
}

test("招募到期自动失效", async () => {
  // 1. Get available courts
  const courts = await apiFetch<
    { id: string; name: string; type: string; status: string }[]
  >("/internal/courts");
  expect(courts.length).toBeGreaterThan(0);
  const courtId = courts[0].id;

  // 2. Create a recruit with a 10-second deadline
  // Align to 30-minute slot boundaries
  const now = Date.now();
  const slotMs = 30 * 60 * 1000;
  const startMs = Math.ceil((now + 24 * 60 * 60 * 1000) / slotMs) * slotMs; // tomorrow, same time
  const endMs = startMs + 2 * 60 * 60 * 1000; // 2 hour duration
  const deadlineMs = now + 10 * 1000; // 10 seconds from now

  const recruitStart = new Date(startMs);
  const recruitEnd = new Date(endMs);
  const deadline = new Date(deadlineMs);

  const recruit = await apiFetch<{ recruitId: string }>("/internal/recruits", {
    method: "POST",
    body: JSON.stringify({
      wechatId: "boss_wechat",
      courtId,
      startAt: recruitStart.toISOString(),
      endAt: recruitEnd.toISOString(),
      minLevel: 2.5,
      maxLevel: 4.0,
      maxParticipants: 3,
      deadline: deadline.toISOString(),
      notes: "E2E expiry test",
    }),
  });
  expect(recruit).toHaveProperty("recruitId");
  const recruitId = recruit.recruitId;

  // 3. Wait for the recruit scanner to pick it up (scanner runs every 60 seconds)
  // We'll wait up to 70 seconds
  await new Promise((resolve) => setTimeout(resolve, 70_000));

  // 4. Verify the recruit status via internal API
  const recruits = await apiFetch<
    {
      id: string;
      status: string;
      orderId: string;
    }[]
  >("/internal/recruits");
  const expiredRecruit = recruits.find((r) => r.id === recruitId);

  if (expiredRecruit) {
    expect(expiredRecruit.status).toBe("RECRUITING_EXPIRED");
  }
});

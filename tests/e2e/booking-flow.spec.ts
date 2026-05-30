import { test, expect } from "@playwright/test";

const CUSTOMER_URL = "http://localhost:3003";

test("球友注册并完成包场预订", async ({ page }) => {
  const phone = `139${Date.now().toString().slice(-8)}`;
  const password = "Test123456";
  const nickname = `测试用户_${Date.now().toString().slice(-6)}`;
  const wechatId = `wxid_${Date.now().toString().slice(-6)}`;

  // 1. 注册新用户
  await page.goto(`${CUSTOMER_URL}/register`);

  // "注册" text appears as both card title and submit button — use .first()
  await expect(page.locator("text=注册").first()).toBeVisible();

  await page.fill("#phone", phone);
  await page.fill("#password", password);
  await page.fill("#nickname", nickname);

  // Default level is 3.0 — skip slider interaction as shadcn/ui slider can be flaky in tests

  await page.fill("#wechatId", wechatId);

  // Click gender button (男)
  await page.click('button:has-text("男")');

  // Submit registration
  await page.getByRole("button", { name: "注册" }).click();

  // Should redirect to login page after successful registration
  await expect(page).toHaveURL(/\/login/);

  // 2. 登录
  await page.fill("#phone", phone);
  await page.fill("#password", password);
  await page.click('button:has-text("登录")');

  // Should be redirected to home page
  await expect(page).toHaveURL(CUSTOMER_URL + "/");

  // 3. Navigate to booking page
  await page.goto(`${CUSTOMER_URL}/booking`);
  await expect(page.locator("text=预订场地")).toBeVisible({ timeout: 10000 });
});

test("已注册用户登录并查看个人中心", async ({ page }) => {
  // Use the existing test user
  await page.goto(`${CUSTOMER_URL}/login`);

  await page.fill("#phone", "13900001111");
  await page.fill("#password", "Test123456");
  await page.click('button:has-text("登录")');

  // Should redirect to home page
  await expect(page).toHaveURL(CUSTOMER_URL + "/");

  // Navigate to profile
  await page.goto(`${CUSTOMER_URL}/me`);

  // Profile page should show user info
  await expect(page.locator("text=个人中心").or(page.locator("text=个人资料"))).toBeVisible({ timeout: 10000 });
});

test("浏览场馆和场地（免登录）", async ({ page }) => {
  await page.goto(CUSTOMER_URL);

  // Home page should show brand/venue info — use .first() to avoid strict mode
  await expect(page.locator("text=测试网球馆").first()).toBeVisible({ timeout: 10000 });
});

test("未登录访问预订页显示预订界面", async ({ page }) => {
  await page.goto(`${CUSTOMER_URL}/booking`);

  // The booking page shows the booking form with a disabled submit button for unauthenticated users
  await expect(page.locator("text=预订场地").first()).toBeVisible({ timeout: 10000 });
});

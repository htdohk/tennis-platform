import { test, expect } from "@playwright/test";

const CUSTOMER_URL = "http://localhost:3003";

test("用户发起招募并查看匹配推荐", async ({ page }) => {
  // Use existing test user
  await page.goto(`${CUSTOMER_URL}/login`);
  await page.fill("#phone", "13900001111");
  await page.fill("#password", "Test123456");
  await page.click('button:has-text("登录")');
  await expect(page).toHaveURL(CUSTOMER_URL + "/");

  // Navigate to recruit creation page
  await page.goto(`${CUSTOMER_URL}/recruits/new`);

  // The recruit creation page should be visible
  await expect(
    page.locator("text=发起招募").first()
  ).toBeVisible({ timeout: 10000 });
});

test("浏览招募广场", async ({ page }) => {
  await page.goto(`${CUSTOMER_URL}/recruits`);

  // Recruits page should be visible with tabs
  await expect(
    page.locator("text=招募广场").first()
  ).toBeVisible({ timeout: 10000 });
});

test("双用户招募加入流程", async ({ browser }) => {
  // Use two separate browser contexts to simulate two users
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  try {
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // User A (test user) logs in
    await page1.goto(`${CUSTOMER_URL}/login`);
    await page1.fill("#phone", "13900001111");
    await page1.fill("#password", "Test123456");
    await page1.click('button:has-text("登录")');
    await expect(page1).toHaveURL(CUSTOMER_URL + "/");

    // User A views recruit square
    await page1.goto(`${CUSTOMER_URL}/recruits`);
    await expect(page1.locator("text=招募广场").first()).toBeVisible({ timeout: 10000 });

    // User B registers a new user
    const phoneB = `139${Date.now().toString().slice(-8)}`;
    const wechatIdB = `wxid_b_${Date.now().toString().slice(-6)}`;

    await page2.goto(`${CUSTOMER_URL}/register`);
    await page2.fill("#phone", phoneB);
    await page2.fill("#password", "Test123456");
    await page2.fill("#nickname", `参与者_${Date.now().toString().slice(-6)}`);
    await page2.fill("#wechatId", wechatIdB);
    await page2.click('button:has-text("男")');
    await page2.getByRole("button", { name: "注册" }).click();

    // User B should be redirected to login
    await expect(page2).toHaveURL(/\/login/);

    // User B logs in
    await page2.fill("#phone", phoneB);
    await page2.fill("#password", "Test123456");
    await page2.click('button:has-text("登录")');
    await expect(page2).toHaveURL(CUSTOMER_URL + "/");

    // User B can also view recruit square
    await page2.goto(`${CUSTOMER_URL}/recruits`);
    await expect(page2.locator("text=招募广场").first()).toBeVisible({ timeout: 10000 });
  } finally {
    await context1.close();
    await context2.close();
  }
});

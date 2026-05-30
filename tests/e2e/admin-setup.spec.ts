import { test, expect } from "@playwright/test";

const ADMIN_URL = "http://localhost:3001";

test("管理员登录并查看 Dashboard", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/admin/login`);
  await expect(page.locator("text=Tennis Admin")).toBeVisible();

  await page.fill("#phone", "13800000000");
  await page.fill("#password", "admin123");
  await page.click('button:has-text("登录")');

  await expect(page).toHaveURL(/\/admin$/);
  // Sidebar link and heading both contain "Dashboard" — use .first() to avoid strict mode
  await expect(page.locator("text=Dashboard").first()).toBeVisible();
  await expect(page.locator("text=今日订单")).toBeVisible();
});

test("管理员查看日程看板", async ({ page }) => {
  // Login first
  await page.goto(`${ADMIN_URL}/admin/login`);
  await page.fill("#phone", "13800000000");
  await page.fill("#password", "admin123");
  await page.click('button:has-text("登录")');
  await expect(page).toHaveURL(/\/admin$/);

  // Navigate to schedule (Chinese sidebar label)
  await page.click('a:has-text("日程看板")');
  await expect(page).toHaveURL(/\/admin\/schedule/);

  // Schedule board should be visible
  await expect(page.locator("text=日程看板").first()).toBeVisible();
});

test("管理员管理场馆和场地", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/admin/login`);
  await page.fill("#phone", "13800000000");
  await page.fill("#password", "admin123");
  await page.click('button:has-text("登录")');
  await expect(page).toHaveURL(/\/admin$/);

  // Navigate to venues (Chinese sidebar label)
  await page.click('a:has-text("场馆管理")');
  await expect(page).toHaveURL(/\/admin\/venues/);

  // Should show existing venue
  await expect(page.locator("text=测试网球馆").first()).toBeVisible();

  // Navigate to courts
  await page.click('a:has-text("场地管理")');
  await expect(page).toHaveURL(/\/admin\/courts/);

  // Should show courts (A1, A2, B1, B2)
  await expect(page.locator("text=室内硬地1号场")).toBeVisible();
});

test("管理员查看订单列表", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/admin/login`);
  await page.fill("#phone", "13800000000");
  await page.fill("#password", "admin123");
  await page.click('button:has-text("登录")');
  await expect(page).toHaveURL(/\/admin$/);

  // Navigate to orders
  await page.click('a:has-text("订单管理")');
  await expect(page).toHaveURL(/\/admin\/orders/);

  // Order list page should be visible
  await expect(page.locator("text=订单管理").first()).toBeVisible();
});

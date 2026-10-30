const { test, expect } = require("@playwright/test");

test("Giao diện chính hiển thị", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#content")).toBeVisible();
  await expect(page.locator("#list")).toBeVisible();
});

test("Tạo và tìm thông điệp", async ({ page }) => {
  const msg = "E2E-" + Date.now();

  await page.goto("/");
  await page.locator("#content").fill(msg);

  await page.getByRole("button", { name: "Gửi (POST)" }).click();

  const message = page.locator("#list li").filter({ hasText: msg });

  await expect(message).toBeVisible();
  await page.locator("#q").fill(msg);
  await page.locator("#search").click();
  await expect(message).toHaveCount(1);
});

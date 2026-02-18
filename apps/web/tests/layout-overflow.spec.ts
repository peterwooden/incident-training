import { expect, test } from "@playwright/test";

const BASE_URL = process.env.WEB_URL ?? "http://127.0.0.1:5173";

test("bomb wire interactions do not stretch page width", async ({ page }) => {
  await page.goto(`${BASE_URL}/visual-regression`, { waitUntil: "networkidle" });

  const before = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  const layer = page.locator('[data-testid="fixture-bomb-device"] .bomb-device-panel .interaction-layer');
  await expect(layer).toBeVisible();
  const box = await layer.boundingBox();
  expect(box).not.toBeNull();

  if (!box) {
    return;
  }

  const points = [
    { x: box.x + box.width * 0.46, y: box.y + box.height * 0.22 },
    { x: box.x + box.width * 0.46, y: box.y + box.height * 0.32 },
    { x: box.x + box.width * 0.46, y: box.y + box.height * 0.42 },
    { x: box.x + box.width * 0.46, y: box.y + box.height * 0.52 },
    { x: box.x + box.width * 0.46, y: box.y + box.height * 0.62 },
  ];

  for (let i = 0; i < 4; i += 1) {
    for (const point of points) {
      await page.mouse.click(point.x, point.y);
    }
  }

  const after = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(after.scrollWidth).toBeLessThanOrEqual(after.clientWidth + 1);
  expect(after.scrollWidth).toBeLessThanOrEqual(before.clientWidth + 1);
});

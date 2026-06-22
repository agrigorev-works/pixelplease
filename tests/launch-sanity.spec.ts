import { expect, test } from "@playwright/test";

test("loads, generates a demo font, and keeps launch metadata healthy", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("pixelplease - fastest way to create a custom pixel font");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://pixelplease.tools/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://pixelplease.tools/og-image.png",
  );
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
  await expect(page.locator("#logo-title")).toHaveAttribute("data-logo-font", "ready", { timeout: 20_000 });
  await expect(page.locator("#app-status")).toHaveText("Generated TTF ready", { timeout: 20_000 });
  await expect(page.locator(".footer-copy")).toContainText(/uploaded fonts stay in your browser/i);

  const hasCoarsePointer = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  if (hasCoarsePointer) {
    await expect(page.locator("#sample-text")).not.toBeFocused();
  } else {
    await expect(page.locator("#sample-text")).toBeFocused();
  }

  const canvasBox = await page.locator("#demo-preview-canvas").boundingBox();
  expect(canvasBox?.width).toBeGreaterThan(120);
  expect(canvasBox?.height).toBeGreaterThan(80);

  await expect(page.locator("#download-link")).not.toHaveClass(/is-disabled/);
});

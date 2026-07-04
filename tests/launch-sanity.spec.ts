import { expect, test } from "@playwright/test";

test("loads, generates a demo font, and keeps launch metadata healthy", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Free Pixel Font Generator - Convert a Basic Font to a Pixel TTF | pixelplease");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://pixelplease.tools/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://pixelplease.tools/og-image-20260623.png",
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

test("keeps the launch UI reachable without horizontal overflow at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator("#app-status")).toHaveText("Generated TTF ready", { timeout: 20_000 });

  await expect(page.locator("#source-editor-field")).toBeVisible();
  await expect(page.locator("#demo-preview-frame")).toBeVisible();
  await expect(page.locator("#pixels-per-em")).toBeVisible();
  await expect(page.locator("#download-link")).not.toHaveClass(/is-disabled/);

  const overflow = await page.evaluate(
    () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
  );
  expect(overflow).toBeLessThan(1);

  const horizontalBounds = await page.evaluate(() => {
    const selectors = ["#source-editor-field", "#demo-preview-frame", "#pixels-per-em", "#download-link"];
    return selectors.map((selector) => {
      const element = document.querySelector(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      const box = element.getBoundingClientRect();
      return { selector, left: box.left, right: box.right, width: window.innerWidth };
    });
  });

  for (const bounds of horizontalBounds) {
    expect(bounds.left, `${bounds.selector} left edge`).toBeGreaterThanOrEqual(-1);
    expect(bounds.right, `${bounds.selector} right edge`).toBeLessThanOrEqual(bounds.width + 1);
  }

  await page.locator("#download-link").scrollIntoViewIfNeeded();
  await expect(page.locator("#download-link")).toBeInViewport();
});

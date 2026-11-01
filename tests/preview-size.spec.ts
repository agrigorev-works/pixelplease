import { expect, test, type Page } from "@playwright/test";
import { UI_COPY } from "../src/interface-copy";

const DEFAULT_DESKTOP_PREVIEW_FONT_SIZE = 44;

async function getSourceFontSize(page: Page): Promise<number> {
  return page.locator("#sample-text").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
}

async function getRenderFontSize(page: Page): Promise<number> {
  return page.locator("#demo-preview-canvas").evaluate((canvas) => Number((canvas as HTMLCanvasElement).dataset.renderFontSize));
}

test("resizes source and pixel output previews independently and resets them", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  await expect(page.locator("#source-size-bar")).toBeVisible();
  await expect(page.locator("#output-size-bar")).toBeVisible();
  await expect(page.locator("#source-size-readout")).toContainText(
    UI_COPY.controls.previewSizeReadout(DEFAULT_DESKTOP_PREVIEW_FONT_SIZE),
  );
  await expect(page.locator("#output-size-readout")).toContainText(
    UI_COPY.controls.previewSizeReadout(DEFAULT_DESKTOP_PREVIEW_FONT_SIZE),
  );

  const initialSource = await getSourceFontSize(page);
  const initialRender = await getRenderFontSize(page);
  expect(Math.abs(initialSource - DEFAULT_DESKTOP_PREVIEW_FONT_SIZE)).toBeLessThan(0.5);
  expect(Math.abs(initialRender - DEFAULT_DESKTOP_PREVIEW_FONT_SIZE)).toBeLessThan(0.5);

  // By default the output preview follows the source size.
  await page.getByRole("button", { name: UI_COPY.controls.sourceSizeIncrease }).click();
  await expect.poll(() => getSourceFontSize(page)).toBeGreaterThan(initialSource + 1);
  await expect.poll(() => getRenderFontSize(page)).toBeGreaterThan(initialRender + 1);

  // Pinning the output size must not move the source size.
  const sourceBeforeOutput = await getSourceFontSize(page);
  await page.getByRole("button", { name: UI_COPY.controls.outputSizeDecrease }).click();
  await page.getByRole("button", { name: UI_COPY.controls.outputSizeDecrease }).click();
  await expect.poll(() => getRenderFontSize(page)).toBeLessThan(sourceBeforeOutput - 1);
  expect(Math.abs((await getSourceFontSize(page)) - sourceBeforeOutput)).toBeLessThan(0.5);

  // With the output pinned, changing the source no longer moves the output.
  const pinnedRender = await getRenderFontSize(page);
  await page.getByRole("button", { name: UI_COPY.controls.sourceSizeIncrease }).click();
  await page.getByRole("button", { name: UI_COPY.controls.sourceSizeIncrease }).click();
  await expect.poll(() => getSourceFontSize(page)).toBeGreaterThan(sourceBeforeOutput + 1);
  expect(Math.abs((await getRenderFontSize(page)) - pinnedRender)).toBeLessThan(0.5);

  // Reset restores both preview sizes and disables the reset button.
  const resetButton = page.getByRole("button", { name: UI_COPY.controls.resetDefaults });
  await expect(resetButton).toBeEnabled();
  await resetButton.click();
  await expect.poll(() => getSourceFontSize(page)).toBeLessThan(sourceBeforeOutput);
  expect(Math.abs((await getSourceFontSize(page)) - initialSource)).toBeLessThan(0.5);
  expect(Math.abs((await getRenderFontSize(page)) - initialRender)).toBeLessThan(0.5);
  await expect(resetButton).toBeDisabled();
});

test("keeps preview size controls usable and the layout stable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  await expect(page.locator("#source-size-bar")).toBeVisible();
  await expect(page.locator("#output-size-bar")).toBeVisible();

  const overflow = await page.evaluate(
    () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
  );
  expect(overflow).toBeLessThan(1);

  const sourceBox = await page.locator("#source-editor-field").boundingBox();
  const outputBox = await page.locator("#demo-preview-frame").boundingBox();
  expect(Math.abs((sourceBox?.height ?? 0) - (outputBox?.height ?? 0))).toBeLessThan(2);

  const beforeSource = await getSourceFontSize(page);
  await page.getByRole("button", { name: UI_COPY.controls.sourceSizeIncrease }).click();
  await expect.poll(() => getSourceFontSize(page)).toBeGreaterThan(beforeSource);

  const stillNoOverflow = await page.evaluate(
    () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
  );
  expect(stillNoOverflow).toBeLessThan(1);
});

test("never lets the size controls overlap the preview content, even when enlarged", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  // Push both previews well past the point where text overflows the box.
  for (let i = 0; i < 8; i += 1) {
    await page.getByRole("button", { name: UI_COPY.controls.sourceSizeIncrease }).click();
    await page.getByRole("button", { name: UI_COPY.controls.outputSizeIncrease }).click();
  }

  const gaps = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
    const source = rect("#sample-text");
    const sourceBar = rect("#source-size-bar");
    const scroll = rect("#demo-preview-scroll");
    const outputBar = rect("#output-size-bar");
    if (!source || !sourceBar || !scroll || !outputBar) {
      throw new Error("Missing preview-size layout elements");
    }
    return {
      sourceGap: sourceBar.top - source.bottom,
      outputGap: outputBar.top - scroll.bottom,
    };
  });

  // The control strip sits below the scrollable content, so it can never cover text/canvas.
  expect(gaps.sourceGap).toBeGreaterThanOrEqual(-1);
  expect(gaps.outputGap).toBeGreaterThanOrEqual(-1);
});

test("gives preview size controls accessible labels and desktop hover feedback", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  await expect(page.locator("#source-size-bar")).toHaveAttribute("aria-label", UI_COPY.controls.sourceSizeGroup);
  await expect(page.locator("#output-size-bar")).toHaveAttribute("aria-label", UI_COPY.controls.outputSizeGroup);
  await expect(page.getByRole("button", { name: UI_COPY.controls.sourceSizeDecrease })).toBeVisible();
  await expect(page.getByRole("button", { name: UI_COPY.controls.outputSizeIncrease })).toBeVisible();

  const increaseSource = page.getByRole("button", { name: UI_COPY.controls.sourceSizeIncrease });
  await increaseSource.hover();
  await expect(increaseSource).toHaveCSS("background-color", "rgb(245, 245, 245)");

  const decreaseOutput = page.getByRole("button", { name: UI_COPY.controls.outputSizeDecrease });
  await decreaseOutput.hover();
  await expect(decreaseOutput).toHaveCSS("background-color", "rgb(245, 245, 245)");
});

for (const preview of ["source", "output"] as const) {
  for (const direction of ["increase", "decrease"] as const) {
    test(`holds ${preview} ${direction} to repeat and stops on release`, async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
      const readSize = () => preview === "source" ? getSourceFontSize(page) : getRenderFontSize(page);
      const button = page.locator(`#${preview}-size-${direction}`);
      const sign = direction === "increase" ? 1 : -1;
      const initial = await readSize();
      await button.click();
      expect(await readSize()).toBe(Math.round(initial) + sign * 2);
      await button.hover();
      await page.mouse.down();
      await page.waitForTimeout(650);
      const held = await readSize();
      expect((held - initial) * sign).toBeGreaterThan(4);
      // Sample at release itself: a repeat can legitimately occur between a
      // separate read and the browser receiving mouse.up (especially WebKit).
      await page.evaluate((preview) => {
        window.addEventListener("pointerup", () => {
          const size = preview === "source"
            ? parseFloat(getComputedStyle(document.querySelector("#sample-text")!).fontSize)
            : Number((document.querySelector("#demo-preview-canvas") as HTMLCanvasElement).dataset.renderFontSize);
          document.body.dataset.sizeAtRelease = String(size);
        }, { once: true, capture: true });
      }, preview);
      await page.mouse.up();
      const released = await readSize();
      expect(released).toBe(Number(await page.locator("body").getAttribute("data-size-at-release")));
      await page.waitForTimeout(180);
      expect(await readSize()).toBe(released);
      await button.click();
      expect(await readSize()).toBe(released + sign * 2);
    });
  }
}

test("touch hold stops on cancellation and keyboard activation stays single-step", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  const button = page.locator("#source-size-increase");
  const initial = await getSourceFontSize(page);
  await button.dispatchEvent("pointerdown", { pointerId: 7, pointerType: "touch", button: 0, isPrimary: true });
  await page.waitForTimeout(650);
  expect(await getSourceFontSize(page)).toBeGreaterThan(initial + 2);
  await button.dispatchEvent("pointercancel", { pointerId: 7, pointerType: "touch" });
  const cancelled = await getSourceFontSize(page);
  await page.waitForTimeout(180);
  expect(await getSourceFontSize(page)).toBe(cancelled);
  await button.focus();
  await page.keyboard.press("Space");
  expect(await getSourceFontSize(page)).toBe(cancelled + 2);
});

test("stops held controls at size limits and when the window loses focus", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  const decrease = page.locator("#output-size-decrease");
  await decrease.hover();
  await page.mouse.down();
  await expect(decrease).toBeDisabled({ timeout: 4000 });
  expect(await getRenderFontSize(page)).toBe(16);
  await page.mouse.up();
  const increase = page.locator("#output-size-increase");
  await increase.click();
  expect(await getRenderFontSize(page)).toBe(18);
  await increase.hover();
  await page.mouse.down();
  await page.waitForTimeout(450);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  const blurred = await getRenderFontSize(page);
  await page.waitForTimeout(180);
  expect(await getRenderFontSize(page)).toBe(blurred);
  await page.mouse.up();
  expect(await getRenderFontSize(page)).toBe(blurred);
});

test("releasing outside a held button stops repetition", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await page.locator("#source-size-increase").hover();
  await page.mouse.down();
  await page.waitForTimeout(450);
  await page.mouse.move(2, 2);
  await page.mouse.up();
  const released = await getSourceFontSize(page);
  await page.waitForTimeout(180);
  expect(await getSourceFontSize(page)).toBe(released);
});

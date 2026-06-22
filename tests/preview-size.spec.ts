import { expect, test, type Page } from "@playwright/test";
import { UI_COPY } from "../src/interface-copy";

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
  await expect(page.locator("#source-size-readout")).toContainText("px");
  await expect(page.locator("#output-size-readout")).toContainText("px");

  const initialSource = await getSourceFontSize(page);
  const initialRender = await getRenderFontSize(page);

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

  const sourceBox = await page.locator("#sample-text").boundingBox();
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

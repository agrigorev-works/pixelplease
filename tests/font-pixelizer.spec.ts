import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import opentype from "opentype.js";
import { createFixtureFont } from "./fixture-font";

const artifactsDir = path.resolve("test-artifacts");
const sourcePath = path.join(artifactsDir, "fixture-source.ttf");
const generatedPath = path.join(artifactsDir, "generated-pixel.ttf");
const latoSourcePath = path.resolve("samples/Lato-Regular.ttf");
const latoGeneratedPath = path.join(artifactsDir, "lato-generated-pixel.ttf");

test.beforeAll(async () => {
  await fs.mkdir(artifactsDir, { recursive: true });
  const fixture = createFixtureFont();
  await fs.writeFile(sourcePath, Buffer.from(fixture.toArrayBuffer()));
});

test("uses the available desktop viewport instead of a fixed narrow shell", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/");

  const shellBox = await page.locator(".app-shell").boundingBox();

  expect(shellBox?.width).toBeGreaterThan(1200);
});

test("renders a clean three-column source output settings layout", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.locator(".terminal-bar")).toHaveCount(0);
  await expect(page.getByText("pixelplease.local")).toHaveCount(0);
  await expect(page.locator("#app-status")).toBeHidden();
  await expect(page.locator(".pane-header")).toHaveCount(0);
  await expect(page.locator("h2")).toHaveCount(0);
  await expect(page.locator("#font-summary")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /generate/i })).toHaveCount(0);

  const gridColumns = await page
    .locator(".workspace")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  expect(gridColumns).toBe(3);

  const sourceBox = await page.locator(".source-panel").boundingBox();
  const outputBox = await page.locator(".output-panel").boundingBox();
  const controlsBox = await page.locator(".controls-panel").boundingBox();

  expect(sourceBox?.x).toBeLessThan(outputBox?.x ?? 0);
  expect(outputBox?.x).toBeLessThan(controlsBox?.x ?? 0);
  await expect(page.locator(".source-panel #sample-text")).toBeVisible();
  await expect(page.locator(".source-panel #font-upload")).toBeAttached();
  await expect(page.locator("#source-mode-google")).toBeChecked();
  await expect(page.locator("#google-font-select")).toBeVisible();
  await expect(page.locator("#upload-zone")).toBeHidden();
  await expect(page.locator("#coverage-label")).toHaveCount(0);
  await expect(page.locator("#glyph-grid")).toHaveCount(0);

  const layoutMetrics = await page.evaluate(() => {
    const sourcePanel = document.querySelector(".source-panel");
    const outputPanel = document.querySelector(".output-panel");
    const controlsPanel = document.querySelector(".controls-panel");
    const sourcePreview = document.querySelector("#sample-text");
    const outputPreview = [document.querySelector("#demo-preview-canvas"), document.querySelector("#after-preview")]
      .filter((element): element is Element => Boolean(element))
      .find((element) => getComputedStyle(element).display !== "none");

    if (!sourcePanel || !outputPanel || !controlsPanel || !sourcePreview || !outputPreview) {
      throw new Error("Missing layout elements");
    }

    const sourcePanelBox = sourcePanel.getBoundingClientRect();
    const outputPanelBox = outputPanel.getBoundingClientRect();
    const controlsPanelBox = controlsPanel.getBoundingClientRect();
    const sourcePreviewBox = sourcePreview.getBoundingClientRect();
    const outputPreviewBox = outputPreview.getBoundingClientRect();

    return {
      sourcePreviewHeight: sourcePreviewBox.height,
      outputPreviewHeight: outputPreviewBox.height,
      sourcePreviewBottom: sourcePreviewBox.bottom,
      outputPreviewBottom: outputPreviewBox.bottom,
      sourcePanelBottom: sourcePanelBox.bottom,
      outputPanelBottom: outputPanelBox.bottom,
      controlsPanelBottom: controlsPanelBox.bottom,
    };
  });
  const previewTypography = await page.locator("#sample-text").evaluate((source) => {
    const output = document.getElementById("after-preview");
    const sourceStyle = getComputedStyle(source);
    const outputStyle = output ? getComputedStyle(output) : undefined;
    return {
      sourceFontSize: sourceStyle.fontSize,
      outputFontSize: outputStyle?.fontSize,
      sourceLineHeight: sourceStyle.lineHeight,
      outputLineHeight: outputStyle?.lineHeight,
    };
  });

  expect(Math.abs(layoutMetrics.sourcePreviewHeight - layoutMetrics.outputPreviewHeight)).toBeLessThan(2);
  expect(Math.abs(layoutMetrics.sourcePreviewBottom - layoutMetrics.outputPreviewBottom)).toBeLessThan(1);
  expect(Math.abs(layoutMetrics.sourcePanelBottom - layoutMetrics.outputPanelBottom)).toBeLessThan(1);
  expect(Math.abs(layoutMetrics.sourcePanelBottom - layoutMetrics.controlsPanelBottom)).toBeLessThan(1);
  expect(previewTypography.sourceFontSize).toBe(previewTypography.outputFontSize);
  expect(previewTypography.sourceLineHeight).toBe(previewTypography.outputLineHeight);
});

test("switches Source between Google Font editing and same-size upload drop zone", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.locator("#source-mode-google")).toBeChecked();
  await expect(page.locator("#sample-text")).toBeVisible();
  await expect(page.locator("#sample-text")).toBeFocused();
  await expect(page.locator("#google-font-select")).toBeVisible();
  await expect(page.locator("#upload-zone")).toBeHidden();

  const sourcePanelBox = await page.locator(".source-panel").boundingBox();
  const sourcePreviewBox = await page.locator("#sample-text").boundingBox();

  await page.getByLabel("Your Font").check();
  await expect(page.locator("#source-mode-upload")).toBeChecked();
  await expect(page.locator("#sample-text")).toBeHidden();
  await expect(page.locator("#google-font-select")).toBeHidden();
  await expect(page.locator("#upload-zone")).toBeVisible();
  await expect(page.getByText("choose font file")).toBeVisible();
  await expect(page.getByText(/license to edit/i)).toBeVisible();
  await expect(page.locator(".upload-button")).toHaveCount(0);

  const uploadPanelBox = await page.locator(".source-panel").boundingBox();
  const uploadBox = await page.locator("#upload-zone").boundingBox();
  expect(Math.abs((sourcePanelBox?.width ?? 0) - (uploadPanelBox?.width ?? 0))).toBeLessThan(1);
  expect(Math.abs((sourcePanelBox?.height ?? 0) - (uploadPanelBox?.height ?? 0))).toBeLessThan(1);
  expect(Math.abs((sourcePreviewBox?.height ?? 0) - (uploadBox?.height ?? 0))).toBeLessThan(2);

  await page.locator("#font-upload").setInputFiles(sourcePath);
  await expect(page.locator("#sample-text")).toBeVisible();
  await expect(page.locator("#upload-zone")).toBeHidden();
  await expect(page.locator("#app-status")).toHaveText("Generated TTF ready", { timeout: 20_000 });

  const uploadedPanelBox = await page.locator(".source-panel").boundingBox();
  const uploadedPreviewBox = await page.locator("#sample-text").boundingBox();
  expect(Math.abs((sourcePanelBox?.width ?? 0) - (uploadedPanelBox?.width ?? 0))).toBeLessThan(1);
  expect(Math.abs((sourcePanelBox?.height ?? 0) - (uploadedPanelBox?.height ?? 0))).toBeLessThan(1);
  expect(Math.abs((sourcePreviewBox?.height ?? 0) - (uploadedPreviewBox?.height ?? 0))).toBeLessThan(2);
});

test("focuses source text at the end and offers curated Google demo fonts", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#sample-text")).toBeFocused();
  const caret = await page.locator("#sample-text").evaluate((textarea) => {
    const input = textarea as HTMLTextAreaElement;
    return {
      start: input.selectionStart,
      end: input.selectionEnd,
      length: input.value.length,
    };
  });

  expect(caret.start).toBe(caret.length);
  expect(caret.end).toBe(caret.length);

  await expect(page.locator("#google-font-select")).toBeVisible();
  const fontOptions = await page.locator("#google-font-select option").allTextContents();
  expect(fontOptions.length).toBeGreaterThanOrEqual(5);
  await expect(page.locator("#app-status")).toHaveText("Generated TTF ready", { timeout: 20_000 });
  const initialBlobUrl = await page.evaluate(() => window.__fontPixelizerLastBlobUrl);

  const currentFont = await page.locator("#google-font-select").inputValue();
  await page.locator("#sample-text").fill("MMMM iiiiii 123");
  const nextFont = await page.locator("#google-font-select").evaluate((select) => {
    const element = select as HTMLSelectElement;
    return Array.from(element.options).find((option) => option.value !== element.value)?.value;
  });
  expect(nextFont).toBeTruthy();

  await page.locator("#google-font-select").selectOption(nextFont as string);
  const sourceFontFamily = await page.locator("#sample-text").evaluate((textarea) =>
    getComputedStyle(textarea).fontFamily,
  );

  expect(sourceFontFamily).toContain(nextFont as string);
  expect(nextFont).not.toBe(currentFont);
  await expect
    .poll(
      async () => {
        const url = await page.evaluate(() => window.__fontPixelizerLastBlobUrl);
        return Boolean(url && url !== initialBlobUrl);
      },
      { timeout: 20_000 },
    )
    .toBe(true);
});

test("renders a usable generated Google Font output before upload", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText("Generated TTF ready", { timeout: 20_000 });
  await expect(page.locator("#after-preview")).toBeVisible();
  await expect(page.locator("#demo-preview-canvas")).toBeHidden();
  await expect(page.locator("#download-link")).not.toHaveClass(/is-disabled/);

  await page.locator("#sample-text").fill("Editable source text");
  await expect(page.locator("#after-preview")).toHaveText("Editable source text");

  const beforeBlobUrl = await page.evaluate(() => window.__fontPixelizerLastBlobUrl);
  await page.locator("#pixels-per-em").fill("10");
  await page.locator("#threshold").fill("28");
  await page.locator("#expand").fill("2");
  await page.locator("#shift-x").fill("0.35");
  await page.locator("#shift-y").fill("-0.25");

  await expect
    .poll(
      async () => {
        const url = await page.evaluate(() => window.__fontPixelizerLastBlobUrl);
        return Boolean(url && url !== beforeBlobUrl);
      },
      { timeout: 20_000 },
    )
    .toBe(true);
});

test("removes manual generation, resets controls, and keeps Download TTF primary", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /generate/i })).toHaveCount(0);
  const resetButton = page.getByRole("button", { name: "reset defaults" });
  await expect(resetButton).toBeVisible();
  await expect(resetButton).toBeDisabled();

  await page.locator("#pixels-per-em").fill("12");
  await expect(resetButton).toBeEnabled();
  await page.locator("#threshold").fill("28");
  await page.locator("#expand").fill("2");
  await page.locator("#shift-x").fill("0.35");
  await page.locator("#shift-y").fill("-0.25");
  await resetButton.click();

  await expect(page.locator("#pixels-per-em")).toHaveValue("20");
  await expect(page.locator("#threshold")).toHaveValue("42");
  await expect(page.locator("#expand")).toHaveValue("0");
  await expect(page.locator("#shift-x")).toHaveValue("0");
  await expect(page.locator("#shift-y")).toHaveValue("0");
  await expect(resetButton).toBeDisabled();

  await page.getByLabel("Your Font").check();
  await page.locator("#font-upload").setInputFiles(sourcePath);
  await expect(page.locator("#app-status")).toHaveText("Generated TTF ready", { timeout: 20_000 });

  const downloadStyles = await page.locator("#download-link").evaluate((link) => {
    const styles = getComputedStyle(link);
    return {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      borderRadius: styles.borderRadius,
      height: link.getBoundingClientRect().height,
    };
  });
  const resetStyles = await resetButton.evaluate((button) => {
    const styles = getComputedStyle(button);
    return {
      borderRadius: styles.borderRadius,
      height: button.getBoundingClientRect().height,
    };
  });
  const actionGap = await page.locator(".controls-panel").evaluate((panel) => {
    const controlStack = panel.querySelector(".control-stack")?.getBoundingClientRect();
    const actionStack = panel.querySelector(".action-stack")?.getBoundingClientRect();
    if (!controlStack || !actionStack) {
      throw new Error("Missing control/action stack");
    }
    return actionStack.top - controlStack.bottom;
  });

  expect(downloadStyles.backgroundColor).toBe("rgb(17, 17, 17)");
  expect(downloadStyles.color).toBe("rgb(255, 255, 255)");
  expect(downloadStyles.height).toBeGreaterThanOrEqual(56);
  expect(downloadStyles.borderRadius).toBe("999px");
  expect(resetStyles.borderRadius).toBe("999px");
  expect(actionGap).toBeGreaterThanOrEqual(32);
});

test("uploads a TTF through the Source drop zone, pixelizes Basic Latin, downloads a usable TTF", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Your Font").check();
  await expect(page.getByText("choose font file")).toBeVisible();
  const fixtureBase64 = (await fs.readFile(sourcePath)).toString("base64");
  await page.evaluate((base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const file = new File([bytes], "fixture-source.ttf", { type: "font/ttf" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const event = new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });
    document.getElementById("upload-zone")?.dispatchEvent(event);
  }, fixtureBase64);

  await expect(page.locator("#app-status")).toHaveText("Generated TTF ready", { timeout: 20_000 });

  await page.locator("#pixels-per-em").fill("18");
  await page.locator("#threshold").fill("36");
  await page.locator("#shift-x").fill("0.25");
  await page.locator("#shift-y").fill("-0.2");

  await expect(page.locator("#app-status")).toHaveText("Generated TTF ready", { timeout: 20_000 });
  await expect(page.locator("#after-preview")).toBeVisible();
  await expect(page.locator("#demo-preview-canvas")).toBeHidden();
  await page.screenshot({ path: path.join(artifactsDir, "demo-generated.png"), fullPage: true });

  const firstBlobUrl = await page.evaluate(() => window.__fontPixelizerLastBlobUrl);
  await page.locator("#shift-x").fill("0.45");
  await expect
    .poll(
      async () => {
        const url = await page.evaluate(() => window.__fontPixelizerLastBlobUrl);
        return Boolean(url && url !== firstBlobUrl);
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  const fontFaceLoads = await page.evaluate(async () => {
    const blobUrl = window.__fontPixelizerLastBlobUrl;
    if (!blobUrl) {
      return false;
    }

    const response = await fetch(blobUrl);
    const buffer = await response.arrayBuffer();
    const testUrl = URL.createObjectURL(new Blob([buffer], { type: "font/ttf" }));
    const face = new FontFace("GeneratedSmokeFont", `url(${testUrl}) format("truetype")`);
    await face.load();
    document.fonts.add(face);
    return document.fonts.check('32px "GeneratedSmokeFont"', "ABC 123");
  });
  expect(fontFaceLoads).toBe(true);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download TTF" }).click();
  const download = await downloadPromise;
  await download.saveAs(generatedPath);

  const generated = await fs.readFile(generatedPath);
  const parsed = opentype.parse(generated.buffer.slice(generated.byteOffset, generated.byteOffset + generated.byteLength));

  expect(parsed.glyphs.length).toBeGreaterThan(10);
  expect(parsed.charToGlyph("A").advanceWidth).toBeGreaterThan(0);
});

test("handles a real permissive Google Fonts TTF sample", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Your Font").check();
  await page.locator("#font-upload").setInputFiles(latoSourcePath);
  await expect(page.locator("#app-status")).toHaveText("Generated TTF ready", { timeout: 20_000 });

  await page.locator("#pixels-per-em").fill("22");
  await page.locator("#threshold").fill("42");
  await page.locator("#shift-y").fill("0.3");

  await expect(page.locator("#app-status")).toHaveText("Generated TTF ready", { timeout: 20_000 });
  await page.screenshot({ path: path.join(artifactsDir, "demo-lato-generated.png"), fullPage: true });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download TTF" }).click();
  const download = await downloadPromise;
  await download.saveAs(latoGeneratedPath);

  const generated = await fs.readFile(latoGeneratedPath);
  const parsed = opentype.parse(generated.buffer.slice(generated.byteOffset, generated.byteOffset + generated.byteLength));

  expect(parsed.names.fontFamily.en).toContain("Lato Pixel Test");
  expect(parsed.charToGlyph("P").advanceWidth).toBeGreaterThan(0);
});

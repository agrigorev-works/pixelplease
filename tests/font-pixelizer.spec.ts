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
  await expect(page.locator("#coverage-label")).toHaveCount(0);
  await expect(page.locator("#glyph-grid")).toHaveCount(0);

  const sourcePreviewBox = await page.locator("#sample-text").boundingBox();
  const outputPreviewBox = await page.locator("#demo-preview-canvas").boundingBox();
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

  expect(Math.abs((sourcePreviewBox?.height ?? 0) - (outputPreviewBox?.height ?? 0))).toBeLessThan(2);
  expect(previewTypography.sourceFontSize).toBe(previewTypography.outputFontSize);
  expect(previewTypography.sourceLineHeight).toBe(previewTypography.outputLineHeight);
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
  await expect(page.locator("#before-label")).toContainText(/Google Fonts/i);

  const currentFont = await page.locator("#google-font-select").inputValue();
  await page.locator("#sample-text").fill("MMMM iiiiii 123");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const beforeCanvas = await page.locator("#demo-preview-canvas").evaluate((canvas) =>
    (canvas as HTMLCanvasElement).toDataURL(),
  );
  const nextFont = await page.locator("#google-font-select").evaluate((select) => {
    const element = select as HTMLSelectElement;
    return Array.from(element.options).find((option) => option.value !== element.value)?.value;
  });
  expect(nextFont).toBeTruthy();

  await page.locator("#google-font-select").selectOption(nextFont as string);
  await expect(page.locator("#before-label")).toContainText(nextFont as string);
  const sourceFontFamily = await page.locator("#sample-text").evaluate((textarea) =>
    getComputedStyle(textarea).fontFamily,
  );

  expect(sourceFontFamily).toContain(nextFont as string);
  expect(nextFont).not.toBe(currentFont);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await expect
    .poll(
      async () =>
        page.locator("#demo-preview-canvas").evaluate((canvas) =>
          (canvas as HTMLCanvasElement).toDataURL(),
        ),
      { timeout: 10_000 },
    )
    .not.toBe(beforeCanvas);
});

test("renders a usable default pixel preview before upload", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText("demo mode");
  await expect(page.locator("#demo-preview-canvas")).toBeVisible();
  await expect(page.locator("#after-preview")).toBeHidden();

  await page.locator("#sample-text").fill("Editable source text");

  const before = await page.locator("#demo-preview-canvas").evaluate((canvas) =>
    (canvas as HTMLCanvasElement).toDataURL(),
  );

  await page.locator("#pixels-per-em").fill("10");
  await page.locator("#threshold").fill("28");
  await page.locator("#expand").fill("2");
  await page.locator("#shift-x").fill("0.35");
  await page.locator("#shift-y").fill("-0.25");

  const after = await page.locator("#demo-preview-canvas").evaluate((canvas) =>
    (canvas as HTMLCanvasElement).toDataURL(),
  );

  expect(after).not.toBe(before);
});

test("uploads a TTF through the local font button, pixelizes Basic Latin, downloads a usable TTF", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("upload your font")).toBeVisible();
  await expect(page.locator("#upload-zone")).toHaveCount(0);
  await page.locator("#font-upload").setInputFiles(sourcePath);

  await expect(page.locator("#app-status")).toHaveText("Ready to generate");
  await expect(page.locator("#font-summary")).toContainText("Fixture Sans");

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

  await page.locator("#font-upload").setInputFiles(latoSourcePath);
  await expect(page.locator("#app-status")).toHaveText("Ready to generate");
  await expect(page.locator("#font-summary")).toContainText("Lato");

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

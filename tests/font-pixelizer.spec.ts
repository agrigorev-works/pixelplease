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

test("renders a usable default pixel preview before upload", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText("demo mode");
  await expect(page.locator("#demo-preview-canvas")).toBeVisible();
  await expect(page.locator("#after-preview")).toBeHidden();

  const before = await page.locator("#demo-preview-canvas").evaluate((canvas) =>
    (canvas as HTMLCanvasElement).toDataURL(),
  );

  await page.locator("#pixels-per-em").fill("10");
  await page.locator("#threshold").fill("28");
  await page.locator("#expand").fill("2");

  const after = await page.locator("#demo-preview-canvas").evaluate((canvas) =>
    (canvas as HTMLCanvasElement).toDataURL(),
  );

  expect(after).not.toBe(before);
});

test("uploads a TTF through drag and drop, pixelizes Basic Latin, downloads a usable TTF", async ({ page }) => {
  await page.goto("/");

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

  await expect(page.locator("#app-status")).toHaveText("Ready to generate");
  await expect(page.locator("#coverage-label")).toContainText("supported characters");

  await page.locator("#pixels-per-em").fill("18");
  await page.locator("#threshold").fill("36");
  await page.getByRole("button", { name: "generate ttf" }).click();

  await expect(page.locator("#app-status")).toHaveText("Generated TTF ready", { timeout: 20_000 });
  await expect(page.locator("#after-preview")).toBeVisible();
  await expect(page.locator("#demo-preview-canvas")).toBeHidden();
  await page.screenshot({ path: path.join(artifactsDir, "demo-generated.png"), fullPage: true });

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
  await page.getByRole("button", { name: "generate ttf" }).click();

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

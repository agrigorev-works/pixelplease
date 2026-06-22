import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import opentype from "opentype.js";
import { UI_COPY } from "../src/interface-copy";
import { createFixtureFont } from "./fixture-font";

const artifactsDir = path.resolve("test-artifacts");
const sourcePath = path.join(artifactsDir, "fixture-source.ttf");
const generatedPackagePath = path.join(artifactsDir, "generated-pixel.zip");
const googleGeneratedPackagePath = path.join(artifactsDir, "google-generated-pixel.zip");
const latoSourcePath = path.resolve("samples/Lato-Regular.ttf");
const latoGeneratedPackagePath = path.join(artifactsDir, "lato-generated-pixel.zip");

test.beforeAll(async () => {
  await fs.mkdir(artifactsDir, { recursive: true });
  const fixture = createFixtureFont();
  await fs.writeFile(sourcePath, Buffer.from(fixture.toArrayBuffer()));
});

test("serves an LLM discovery file from the site root", async ({ page }) => {
  const response = await page.request.get("/llms.txt");

  expect(response.ok()).toBe(true);

  const body = await response.text();
  expect(body).toContain("# pixelplease");
  expect(body).toContain("browser-based pixel font generator");
  expect(body).toContain("Uploaded fonts are read locally in the browser");
  expect(body).toContain("## Product");
  expect(body).toContain("## Licensing");
  expect(body).toContain("[llms.txt proposal](https://llmstxt.org/)");
});

test("serves favicon and app icon assets", async ({ page }) => {
  const iconPaths = [
    "/favicon.ico",
    "/icons/favicon-16.png",
    "/icons/favicon-32.png",
    "/icons/favicon-48.png",
    "/apple-touch-icon.png",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/site.webmanifest",
  ];

  for (const iconPath of iconPaths) {
    const response = await page.request.get(iconPath);
    expect(response.ok(), iconPath).toBe(true);
  }

  await page.goto("/");
  await expect(page.locator('link[rel="icon"][href="/favicon.ico"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"][href="/apple-touch-icon.png"]')).toHaveCount(1);
  await expect(page.locator('link[rel="manifest"][href="/site.webmanifest"]')).toHaveCount(1);

  const manifest = await (await page.request.get("/site.webmanifest")).json();
  expect(manifest.name).toBe("pixelplease");
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: "/icons/icon-192.png", sizes: "192x192" }),
      expect.objectContaining({ src: "/icons/icon-512.png", sizes: "512x512" }),
    ]),
  );
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
  await expect(page.locator(".prompt-line")).toHaveCount(0);
  await expect(page.getByText("font-to-pixel --local")).toHaveCount(0);
  await expect(page.locator("#app-status")).toBeHidden();
  await expect(page.locator(".pane-header")).toHaveCount(0);
  await expect(page.locator("h2")).toHaveCount(0);
  await expect(page.locator("#font-summary")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /generate/i })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "pixel please" })).toBeVisible();
  await expect(page.locator("#logo-title")).toHaveAttribute("data-logo-font", "ready", { timeout: 20_000 });

  const gridColumns = await page
    .locator(".workspace")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  expect(gridColumns).toBe(3);

  const sourceBox = await page.locator(".source-panel").boundingBox();
  const outputBox = await page.locator(".output-panel").boundingBox();
  const controlsBox = await page.locator(".controls-panel").boundingBox();

  expect(sourceBox?.x).toBeLessThan(outputBox?.x ?? 0);
  expect(outputBox?.x).toBeLessThan(controlsBox?.x ?? 0);
  const introMetrics = await page.evaluate(() => {
    const title = document.querySelector("h1");
    const copy = document.querySelector(".intro-copy");
    if (!title || !copy) {
      throw new Error("Missing intro elements");
    }

    const titleBox = title.getBoundingClientRect();
    const copyBox = copy.getBoundingClientRect();
    const introBox = document.querySelector(".intro")?.getBoundingClientRect();
    const sourceBox = document.querySelector(".source-panel")?.getBoundingClientRect();
    const controlsBox = document.querySelector(".controls-panel")?.getBoundingClientRect();
    const titleStyles = getComputedStyle(title);
    const copyStyles = getComputedStyle(copy);
    const selectStyles = getComputedStyle(document.querySelector("#google-font-select") as Element);

    return {
      copyLeft: copyBox.left,
      copyTop: copyBox.top,
      titleLeft: titleBox.left,
      titleTop: titleBox.top,
      titleTextAlign: titleStyles.textAlign,
      copyTextAlign: copyStyles.textAlign,
      introBottom: introBox?.bottom,
      sourceTop: sourceBox?.top,
      titleFontFamily: titleStyles.fontFamily,
      copyFontFamily: copyStyles.fontFamily,
      copyFontSize: copyStyles.fontSize,
      copyColor: copyStyles.color,
      selectFontFamily: selectStyles.fontFamily,
      selectFontSize: selectStyles.fontSize,
      selectColor: selectStyles.color,
      controlsWidth: controlsBox?.width,
    };
  });
  expect(introMetrics.copyLeft).toBeLessThan(introMetrics.titleLeft);
  expect(Math.abs(introMetrics.copyTop - introMetrics.titleTop)).toBeLessThan(1);
  expect(introMetrics.titleTextAlign).toBe("right");
  expect(introMetrics.copyTextAlign).toBe("left");
  expect((introMetrics.sourceTop ?? 0) - (introMetrics.introBottom ?? 0)).toBeLessThan(56);
  expect(introMetrics.titleFontFamily).toContain("PixelpleaseLogoFont");
  expect(introMetrics.copyFontFamily).toBe(introMetrics.selectFontFamily);
  expect(introMetrics.copyFontSize).toBe(introMetrics.selectFontSize);
  expect(introMetrics.copyColor).toBe(introMetrics.selectColor);
  expect(introMetrics.controlsWidth).toBeLessThanOrEqual(300);
  await expect(page.locator(".site-footer")).toHaveAttribute("aria-label", UI_COPY.footer.ariaLabel);
  await expect(page.locator(".footer-copy")).toHaveText(UI_COPY.footer.lines.join("\n"));

  const footerMetrics = await page.evaluate(() => {
    const workspace = document.querySelector(".workspace");
    const footer = document.querySelector(".site-footer");
    const footerCopy = document.querySelector(".footer-copy");
    const fieldLabel = document.querySelector(".field span");
    if (!workspace || !footer || !footerCopy || !fieldLabel) {
      throw new Error("Missing footer elements");
    }

    const workspaceBox = workspace.getBoundingClientRect();
    const footerBox = footer.getBoundingClientRect();
    const footerCopyBox = footerCopy.getBoundingClientRect();
    const footerStyles = getComputedStyle(footerCopy);
    const fieldLabelStyles = getComputedStyle(fieldLabel);

    return {
      footerCenterDelta: Math.abs(footerCopyBox.left + footerCopyBox.width / 2 - window.innerWidth / 2),
      footerTopGap: footerBox.top - workspaceBox.bottom,
      footerTextAlign: footerStyles.textAlign,
      footerFontSize: footerStyles.fontSize,
      footerLineHeight: footerStyles.lineHeight,
      footerColor: footerStyles.color,
      fieldFontSize: fieldLabelStyles.fontSize,
      fieldLineHeight: fieldLabelStyles.lineHeight,
      fieldColor: fieldLabelStyles.color,
    };
  });

  expect(footerMetrics.footerCenterDelta).toBeLessThan(1);
  expect(footerMetrics.footerTopGap).toBeGreaterThanOrEqual(48);
  expect(footerMetrics.footerTextAlign).toBe("center");
  expect(footerMetrics.footerFontSize).toBe(footerMetrics.fieldFontSize);
  expect(footerMetrics.footerLineHeight).toBe(footerMetrics.fieldLineHeight);
  expect(footerMetrics.footerColor).toBe(footerMetrics.fieldColor);
  await expect(page.locator(".source-panel #sample-text")).toBeVisible();
  await expect(page.locator(".source-panel #font-upload")).toBeAttached();
  await expect(page.locator("#source-mode-google")).toBeChecked();
  await expect(page.locator("#google-font-select")).toBeVisible();
  await expect(page.locator("#google-font-field span")).toHaveCount(0);
  await expect(page.locator("#upload-zone")).toBeHidden();
  await expect(page.locator("#coverage-label")).toHaveCount(0);
  await expect(page.locator("#glyph-grid")).toHaveCount(0);

  const layoutMetrics = await page.evaluate(() => {
    const sourcePanel = document.querySelector(".source-panel");
    const outputPanel = document.querySelector(".output-panel");
    const controlsPanel = document.querySelector(".controls-panel");
    const sourcePreview = document.querySelector("#sample-text");
    const outputPreview = [document.querySelector("#demo-preview-frame"), document.querySelector("#after-preview")]
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
      sourcePreviewTop: sourcePreviewBox.top,
      outputPreviewTop: outputPreviewBox.top,
      controlsPanelTop: controlsPanelBox.top,
      sourcePreviewBottom: sourcePreviewBox.bottom,
      outputPreviewBottom: outputPreviewBox.bottom,
      sourcePanelBottom: sourcePanelBox.bottom,
      outputPanelBottom: outputPanelBox.bottom,
      controlsPanelBottom: controlsPanelBox.bottom,
    };
  });
  const previewTypography = await getCanvasTypographySyncMetrics(page);

  expect(Math.abs(layoutMetrics.sourcePreviewHeight - layoutMetrics.outputPreviewHeight)).toBeLessThan(2);
  expect(Math.abs(layoutMetrics.sourcePreviewTop - layoutMetrics.outputPreviewTop)).toBeLessThan(1);
  expect(Math.abs(layoutMetrics.sourcePreviewTop - layoutMetrics.controlsPanelTop)).toBeLessThan(1);
  expect(Math.abs(layoutMetrics.sourcePreviewBottom - layoutMetrics.outputPreviewBottom)).toBeLessThan(1);
  expect(Math.abs(layoutMetrics.sourcePanelBottom - layoutMetrics.outputPanelBottom)).toBeLessThan(1);
  expect(Math.abs(layoutMetrics.sourcePanelBottom - layoutMetrics.controlsPanelBottom)).toBeLessThan(1);
  expect(previewTypography.fontSizeDelta).toBeLessThan(0.01);
  expect(previewTypography.lineHeightDelta).toBeLessThan(0.01);
  expect(previewTypography.paddingLeftDelta).toBeLessThan(0.01);
  expect(previewTypography.paddingTopDelta).toBeLessThan(0.01);
  expect(previewTypography.canvasWidthDelta).toBeLessThan(1);
});

test("stacks the intro when the header no longer fits horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 760 });
  await page.goto("/");

  const metrics = await page.evaluate(() => {
    const intro = document.querySelector(".intro");
    const title = document.querySelector("h1");
    const copy = document.querySelector(".intro-copy");
    const workspace = document.querySelector(".workspace");
    const controls = document.querySelector(".controls-panel");
    if (!intro || !title || !copy || !workspace || !controls) {
      throw new Error("Missing intro elements");
    }

    const introBox = intro.getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    const copyBox = copy.getBoundingClientRect();
    const titleStyles = getComputedStyle(title);
    const copyStyles = getComputedStyle(copy);
    const workspaceStyles = getComputedStyle(workspace);
    const copyRange = document.createRange();
    copyRange.selectNodeContents(copy);
    const copyLineCount = new Set(
      Array.from(copyRange.getClientRects()).map((rect) => Math.round(rect.top)),
    ).size;
    copyRange.detach();

    return {
      titleCenterDelta: Math.abs(titleBox.left + titleBox.width / 2 - (introBox.left + introBox.width / 2)),
      copyCenterDelta: Math.abs(copyBox.left + copyBox.width / 2 - (introBox.left + introBox.width / 2)),
      copyBelowTitle: copyBox.top > titleBox.bottom,
      titleCopyGap: copyBox.top - titleBox.bottom,
      copyLineCount,
      titleTextAlign: titleStyles.textAlign,
      copyTextAlign: copyStyles.textAlign,
      controlsWidth: controls.getBoundingClientRect().width,
      gridColumns: workspaceStyles.gridTemplateColumns.split(" ").length,
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    };
  });

  expect(metrics.titleCenterDelta).toBeLessThan(1);
  expect(metrics.copyCenterDelta).toBeLessThan(1);
  expect(metrics.copyBelowTitle).toBe(true);
  expect(metrics.titleCopyGap).toBeCloseTo(22, 0);
  expect(metrics.copyLineCount).toBe(3);
  expect(metrics.titleTextAlign).toBe("center");
  expect(metrics.copyTextAlign).toBe("center");
  expect(metrics.controlsWidth).toBeLessThanOrEqual(230);
  expect(metrics.gridColumns).toBe(3);
  expect(metrics.overflow).toBe(0);
});

test("switches Source between Google Font editing and same-size upload drop zone", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.locator("#source-mode-google")).toBeChecked();
  await expect(page.locator("#sample-text")).toBeVisible();
  await expect(page.locator("#sample-text")).toBeFocused();
  const sourceFocusStyles = await page.locator("#sample-text").evaluate((textarea) => {
    const styles = getComputedStyle(textarea);
    return {
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      outlineColor: styles.outlineColor,
      outlineStyle: styles.outlineStyle,
    };
  });
  expect(sourceFocusStyles.backgroundColor).toBe("rgb(255, 255, 255)");
  expect(sourceFocusStyles.borderColor).toBe("rgb(17, 17, 17)");
  expect(sourceFocusStyles.outlineColor).toBe("rgb(17, 17, 17)");
  expect(sourceFocusStyles.outlineStyle).toBe("solid");
  await page.locator("#google-font-select").focus();
  await expect(page.locator("#sample-text")).toHaveCSS("background-color", "rgb(245, 245, 245)");
  await expect(page.locator("#google-font-select")).toBeVisible();
  await expect(page.locator("#google-font-field span")).toHaveCount(0);
  await expect(page.locator("#upload-zone")).toBeHidden();
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await expect(page.locator("#after-preview")).toBeHidden();
  await expect(page.locator("#demo-preview-canvas")).toBeVisible();
  await expectPixelCanvasHasInk(page);

  const sourcePanelBox = await page.locator(".source-panel").boundingBox();
  const sourcePreviewBox = await page.locator("#sample-text").boundingBox();
  const googleSelectBox = await page.locator("#google-font-select").boundingBox();
  const outputBeforeModeSwitch = await page.locator("#after-preview").evaluate((preview) => {
    const styles = getComputedStyle(preview);
    return {
      fontFamily: styles.fontFamily,
      text: preview.textContent,
    };
  });
  const blobBeforeModeSwitch = await getGeneratedFontUrl(page);

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await expect(page.locator("#source-mode-upload")).toBeChecked();
  await expect(page.locator("#sample-text")).toBeHidden();
  await expect(page.locator("#google-font-select")).toBeHidden();
  await expect(page.locator("#upload-zone")).toBeVisible();
  await expect(page.locator("#after-preview")).toBeHidden();
  await expect(page.locator("#demo-preview-canvas")).toBeVisible();
  await expect(page.getByText("choose font file")).toHaveCount(0);
  await expect(page.locator("#upload-zone .upload-title")).toHaveText(UI_COPY.source.uploadTitle);
  await expect(page.getByText(/license to edit/i)).toBeVisible();
  await expect(page.locator(".upload-button")).toHaveCount(0);
  const uploadZoneStyles = await page.locator("#upload-zone").evaluate((zone) => {
    const styles = getComputedStyle(zone);
    return {
      borderColor: styles.borderColor,
      borderRadius: styles.borderRadius,
      borderStyle: styles.borderStyle,
    };
  });
  expect(uploadZoneStyles.borderColor).toBe("rgb(17, 17, 17)");
  expect(uploadZoneStyles.borderRadius).toBe("999px");
  expect(uploadZoneStyles.borderStyle).toBe("dashed");

  const uploadPanelBox = await page.locator(".source-panel").boundingBox();
  const uploadBox = await page.locator("#upload-zone").boundingBox();
  const outputAfterModeSwitch = await page.locator("#after-preview").evaluate((preview) => {
    const styles = getComputedStyle(preview);
    return {
      fontFamily: styles.fontFamily,
      text: preview.textContent,
    };
  });
  const blobAfterModeSwitch = await getGeneratedFontUrl(page);
  expect(Math.abs((sourcePanelBox?.width ?? 0) - (uploadPanelBox?.width ?? 0))).toBeLessThan(1);
  expect(Math.abs((sourcePanelBox?.height ?? 0) - (uploadPanelBox?.height ?? 0))).toBeLessThan(1);
  expect(Math.abs((sourcePreviewBox?.height ?? 0) - (uploadBox?.height ?? 0))).toBeLessThan(2);
  expect(outputAfterModeSwitch).toEqual(outputBeforeModeSwitch);
  expect(blobAfterModeSwitch).toBe(blobBeforeModeSwitch);

  await page.getByRole("radio", { name: UI_COPY.sourceModes.google }).check();
  await expect(page.locator("#source-mode-google")).toBeChecked();
  await expect(page.locator("#sample-text")).toBeVisible();
  await expect(page.locator("#google-font-select")).toBeVisible();
  await expect(page.locator("#upload-zone")).toBeHidden();
  await expect(page.locator("#after-preview")).toBeHidden();
  await expect(page.locator("#demo-preview-canvas")).toBeVisible();

  const outputAfterReturn = await page.locator("#after-preview").evaluate((preview) => {
    const styles = getComputedStyle(preview);
    return {
      fontFamily: styles.fontFamily,
      text: preview.textContent,
    };
  });
  const blobAfterReturn = await getGeneratedFontUrl(page);
  expect(outputAfterReturn).toEqual(outputBeforeModeSwitch);
  expect(blobAfterReturn).toBe(blobBeforeModeSwitch);

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await expect(page.locator("#upload-zone")).toBeVisible();
  await page.locator("#font-upload").setInputFiles(sourcePath);
  await expect(page.locator("#sample-text")).toBeVisible();
  await expect(page.locator("#upload-zone")).toBeHidden();
  await expect(page.getByRole("button", { name: UI_COPY.source.replaceFont })).toBeVisible();
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  const uploadedPanelBox = await page.locator(".source-panel").boundingBox();
  const uploadedPreviewBox = await page.locator("#sample-text").boundingBox();
  const replaceButtonBox = await page.getByRole("button", { name: UI_COPY.source.replaceFont }).boundingBox();
  const replaceButtonStyles = await page.getByRole("button", { name: UI_COPY.source.replaceFont }).evaluate((button) => {
    const styles = getComputedStyle(button);
    return {
      borderColor: styles.borderColor,
      borderRadius: styles.borderRadius,
    };
  });
  expect(Math.abs((sourcePanelBox?.width ?? 0) - (uploadedPanelBox?.width ?? 0))).toBeLessThan(1);
  expect(Math.abs((sourcePanelBox?.height ?? 0) - (uploadedPanelBox?.height ?? 0))).toBeLessThan(1);
  expect(Math.abs((sourcePreviewBox?.height ?? 0) - (uploadedPreviewBox?.height ?? 0))).toBeLessThan(2);
  expect(Math.abs((googleSelectBox?.height ?? 0) - (replaceButtonBox?.height ?? 0))).toBeLessThan(1);
  expect(replaceButtonStyles.borderColor).toBe("rgb(17, 17, 17)");
  expect(replaceButtonStyles.borderRadius).toBe("999px");

  await page.getByRole("radio", { name: UI_COPY.sourceModes.google }).check();
  await expect(page.locator("#source-mode-google")).toBeChecked();
  await expect(page.locator("#google-font-select")).toBeVisible();
  await expect(page.getByRole("button", { name: UI_COPY.source.replaceFont })).toBeHidden();
  await expect(page.locator("#upload-zone")).toBeHidden();

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await expect(page.locator("#source-mode-upload")).toBeChecked();
  await expect(page.locator("#sample-text")).toBeVisible();
  await expect(page.locator("#upload-zone")).toBeHidden();
  await expect(page.getByRole("button", { name: UI_COPY.source.replaceFont })).toBeVisible();
  await expect(page.locator("#sample-text")).toHaveCSS("font-family", /SourcePreviewFont/);
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
});

test("focuses source text at the end and starts with Merriweather Google demo font", async ({ page }) => {
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
  await expect(page.locator("#google-font-select")).toHaveValue("Merriweather");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  const initialBlobUrl = await getGeneratedFontUrl(page);

  const currentFont = await page.locator("#google-font-select").inputValue();
  expect(currentFont).toBe("Merriweather");
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
        const url = await getGeneratedFontUrl(page);
        return Boolean(url && url !== initialBlobUrl);
      },
      { timeout: 20_000 },
    )
    .toBe(true);
});

test("renders a usable generated Google Font output before upload", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await expect(page.locator("#google-font-select")).toHaveValue("Merriweather");
  await expect(page.locator("#after-preview")).toBeHidden();
  await expect(page.locator("#demo-preview-canvas")).toBeVisible();
  await expectPixelCanvasHasInk(page);
  await expect(page.locator("#download-link")).not.toHaveClass(/is-disabled/);

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await expect(page.locator("#upload-zone")).toBeVisible();

  const uploadModeBlobBeforeControls = await getGeneratedFontUrl(page);
  await page.locator("#pixels-per-em").fill("21");
  await expect
    .poll(
      async () => {
        const url = await getGeneratedFontUrl(page);
        return Boolean(url && url !== uploadModeBlobBeforeControls);
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  const googleDownloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: UI_COPY.controls.downloadTtf }).click();
  const googleDownload = await googleDownloadPromise;
  await googleDownload.saveAs(googleGeneratedPackagePath);

  const googlePackageBytes = await fs.readFile(googleGeneratedPackagePath);
  const googlePackageEntries = readStoredZip(googlePackageBytes);
  const googleNotice = new TextDecoder().decode(googlePackageEntries["NOTICE.txt"]);
  const googleGenerated = googlePackageEntries["Pixelplease-Test.ttf"];
  const googleParsed = opentype.parse(
    googleGenerated.buffer.slice(googleGenerated.byteOffset, googleGenerated.byteOffset + googleGenerated.byteLength),
  );

  expect(Object.keys(googlePackageEntries).sort()).toEqual([
    "NOTICE.txt",
    "Pixelplease-Test.ttf",
    "licenses/merriweather-OFL.txt",
  ]);
  expect(googleNotice).toContain("Merriweather");
  expect(googleNotice).toContain("Source license: OFL");
  expect(googleNotice).toContain("Source license file: merriweather-OFL.txt");
  expect(googleNotice).toContain("Bundled source license package path: licenses/merriweather-OFL.txt");
  expect(googleNotice).toContain("Merriweather[opsz,wdth,wght].ttf");
  expect(new TextDecoder().decode(googlePackageEntries["licenses/merriweather-OFL.txt"])).toContain(
    "Reserved Font Name \"Merriweather\"",
  );
  expect(googleParsed.names.fontFamily.en).toBe("Pixelplease Test");
  expect(googleParsed.names.fontFamily.en).not.toContain("Merriweather");
  expect(googleParsed.names.licenseURL.en).toBe("https://openfontlicense.org");

  await page.getByRole("radio", { name: UI_COPY.sourceModes.google }).check();
  await expect(page.locator("#sample-text")).toBeVisible();

  await page.locator("#sample-text").fill("Editable source text");
  await expect(page.locator("#after-preview")).toHaveText("Editable source text");

  const beforeBlobUrl = await getGeneratedFontUrl(page);
  await page.locator("#pixels-per-em").fill("10");
  await page.locator("#threshold").fill("28");
  await page.locator("#expand").fill("2");
  await page.locator("#shift-x").fill("0.35");
  await page.locator("#shift-y").fill("-0.25");

  await expect
    .poll(
      async () => {
        const url = await getGeneratedFontUrl(page);
        return Boolean(url && url !== beforeBlobUrl);
      },
      { timeout: 20_000 },
    )
    .toBe(true);
});

test("keeps generated output canvas-backed at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await expect(page.locator("#after-preview")).toBeHidden();
  await expect(page.locator("#demo-preview-canvas")).toBeVisible();
  await expect(page.locator("#download-link")).not.toHaveClass(/is-disabled/);

  const firstSignature = await expectPixelCanvasHasInk(page);
  await page.locator("#sample-text").fill("Mobile pixel test");
  await expect(page.locator("#after-preview")).toHaveText("Mobile pixel test");

  await expect
    .poll(
      async () => {
        const nextSignature = await getPixelCanvasSignature(page);
        return nextSignature.hash !== firstSignature.hash && nextSignature.darkSamples > 12;
      },
      { timeout: 5_000 },
    )
    .toBe(true);
});

test("wraps generated canvas output instead of squeezing it in narrow columns", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 760 });
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await page
    .locator("#sample-text")
    .fill(
      [
        "PixelpleaseSupercalifragilisticexpialidociousPixelOutputWrapCheck",
        "PixelpleaseSupercalifragilisticexpialidociousPixelOutputWrapCheck",
        "PixelpleaseSupercalifragilisticexpialidociousPixelOutputWrapCheck",
        "PixelpleaseSupercalifragilisticexpialidociousPixelOutputWrapCheck",
      ].join(" "),
    );

  await expect
    .poll(
      async () => {
        const metrics = await getPixelCanvasLayoutMetrics(page);
        return (
          metrics.cssWidth < 320 &&
          Math.abs(metrics.backingCssWidth - metrics.cssWidth) < 1 &&
          metrics.frameScrollHeight > metrics.frameClientHeight + 40 &&
          metrics.canvasCssHeight > metrics.frameClientHeight + 40 &&
          metrics.bottomDarkSamples > 20
        );
      },
      { timeout: 5_000 },
    )
    .toBe(true);
});

test("keeps generated canvas typography synced with source across resizes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  const desktopMetrics = await expectCanvasTypographySynced(page);

  await page.setViewportSize({ width: 900, height: 760 });
  const narrowMetrics = await expectCanvasTypographySynced(page);
  expect(narrowMetrics.frameWidth).toBeLessThan(desktopMetrics.frameWidth);

  await page.setViewportSize({ width: 390, height: 844 });
  const phoneMetrics = await expectCanvasTypographySynced(page);
  expect(phoneMetrics.renderFontSize).toBeLessThan(desktopMetrics.renderFontSize);
  expect(phoneMetrics.frameWidth).toBeLessThan(desktopMetrics.frameWidth);
});

test("removes manual generation, resets controls, and keeps Download package primary", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /generate/i })).toHaveCount(0);
  const resetButton = page.getByRole("button", { name: UI_COPY.controls.resetDefaults });
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

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await page.locator("#font-upload").setInputFiles(sourcePath);
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

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
  const controlGap = await page
    .locator(".control-stack")
    .evaluate((stack) => getComputedStyle(stack).rowGap);

  expect(downloadStyles.backgroundColor).toBe("rgb(17, 17, 17)");
  expect(downloadStyles.color).toBe("rgb(255, 255, 255)");
  expect(downloadStyles.height).toBeGreaterThanOrEqual(56);
  expect(downloadStyles.borderRadius).toBe("999px");
  expect(resetStyles.borderRadius).toBe("999px");
  expect(actionGap).toBeGreaterThanOrEqual(32);
  expect(controlGap).toBe("18px");
});

test("keeps controls compact while separating buttons at small sizes", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 560 });
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  const shortViewportMetrics = await getControlsSpacingMetrics(page);
  expect(shortViewportMetrics.controlGap).toBe("18px");
  expect(shortViewportMetrics.actionGap).toBeGreaterThanOrEqual(24);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileMetrics = await getControlsSpacingMetrics(page);
  expect(mobileMetrics.controlGap).toBe("18px");
  expect(mobileMetrics.actionGap).toBeGreaterThanOrEqual(48);
});

test("keeps stacked layout gutters and panel heights aligned", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 560 });
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  const shortDesktopMetrics = await getPanelLayoutMetrics(page);
  expect(shortDesktopMetrics.gridColumnCount).toBe(3);
  expect(shortDesktopMetrics.sourceOutputHeightDelta).toBeLessThan(1);
  expect(shortDesktopMetrics.sourceControlsHeightDelta).toBeLessThan(1);
  expect(shortDesktopMetrics.actionGap).toBeGreaterThanOrEqual(24);
  expect(shortDesktopMetrics.actionOverflow).toBeLessThan(1);

  await page.setViewportSize({ width: 390, height: 620 });
  const stackedMetrics = await getPanelLayoutMetrics(page);

  expect(stackedMetrics.gridColumnCount).toBe(1);
  expect(stackedMetrics.shellPaddingLeft).toBeGreaterThanOrEqual(24);
  expect(stackedMetrics.shellPaddingRight).toBe(stackedMetrics.shellPaddingLeft);
  expect(Math.abs(stackedMetrics.workspaceLeftInset - stackedMetrics.shellPaddingLeft)).toBeLessThan(1);
  expect(Math.abs(stackedMetrics.workspaceRightInset - stackedMetrics.shellPaddingRight)).toBeLessThan(1);
  expect(stackedMetrics.sourceOutputHeightDelta).toBeLessThan(1);
  expect(stackedMetrics.sourceControlsHeightDelta).toBeLessThan(1);
  expect(stackedMetrics.actionGap).toBeGreaterThanOrEqual(24);
  expect(stackedMetrics.actionOverflow).toBeLessThan(1);
});

test("uploads a TTF through the Source drop zone, pixelizes Basic Latin, downloads a packaged usable TTF", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await expect(page.locator("#upload-zone .upload-title")).toHaveText(UI_COPY.source.uploadTitle);
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

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  await page.locator("#pixels-per-em").fill("18");
  await page.locator("#threshold").fill("36");
  await page.locator("#shift-x").fill("0.25");
  await page.locator("#shift-y").fill("-0.2");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await expect(page.locator("#after-preview")).toBeHidden();
  await expect(page.locator("#demo-preview-canvas")).toBeVisible();
  await expectPixelCanvasHasInk(page);
  await page.screenshot({ path: path.join(artifactsDir, "demo-generated.png"), fullPage: true });

  const firstBlobUrl = await getGeneratedFontUrl(page);
  await page.locator("#shift-x").fill("0.45");
  await expect
    .poll(
      async () => {
        const url = await getGeneratedFontUrl(page);
        return Boolean(url && url !== firstBlobUrl);
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  const blobUrl = await getGeneratedFontUrl(page);
  const fontFaceLoads = await page.evaluate(async (blobUrl) => {
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
  }, blobUrl);
  expect(fontFaceLoads).toBe(true);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: UI_COPY.controls.downloadTtf }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Pixelplease-Test.zip");
  await download.saveAs(generatedPackagePath);

  const packageBytes = await fs.readFile(generatedPackagePath);
  const packageEntries = readStoredZip(packageBytes);
  const notice = new TextDecoder().decode(packageEntries["NOTICE.txt"]);
  const generated = packageEntries["Pixelplease-Test.ttf"];
  const parsed = opentype.parse(generated.buffer.slice(generated.byteOffset, generated.byteOffset + generated.byteLength));

  expect(Object.keys(packageEntries).sort()).toEqual(["NOTICE.txt", "Pixelplease-Test.ttf"]);
  expect(notice).toContain("Fixture Sans");
  expect(notice).toContain("Source license: User-provided; rights not verified by pixelplease.");
  expect(parsed.names.fontFamily.en).toBe("Pixelplease Test");
  expect(parsed.names.fontFamily.en).not.toContain("Fixture");
  expect(parsed.names.license.en).toContain("Generated derivative for testing");
  expect(parsed.names.licenseURL?.en?.trim() ?? "").toBe("");
  expect(parsed.glyphs.length).toBeGreaterThan(10);
  expect(parsed.charToGlyph("A").advanceWidth).toBeGreaterThan(0);
});

test("handles a real permissive Google Fonts TTF sample", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await page.locator("#font-upload").setInputFiles(latoSourcePath);
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  await page.locator("#pixels-per-em").fill("22");
  await page.locator("#threshold").fill("42");
  await page.locator("#shift-y").fill("0.3");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await page.screenshot({ path: path.join(artifactsDir, "demo-lato-generated.png"), fullPage: true });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: UI_COPY.controls.downloadTtf }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Pixelplease-Test.zip");
  await download.saveAs(latoGeneratedPackagePath);

  const packageBytes = await fs.readFile(latoGeneratedPackagePath);
  const packageEntries = readStoredZip(packageBytes);
  const notice = new TextDecoder().decode(packageEntries["NOTICE.txt"]);
  const generated = packageEntries["Pixelplease-Test.ttf"];
  const parsed = opentype.parse(generated.buffer.slice(generated.byteOffset, generated.byteOffset + generated.byteLength));

  expect(notice).toContain("Lato Regular");
  expect(notice).toContain("Lato-Regular.ttf");
  expect(notice).toContain("Source license: User-provided; rights not verified by pixelplease.");
  expect(parsed.names.fontFamily.en).toBe("Pixelplease Test");
  expect(parsed.names.fontFamily.en).not.toContain("Lato");
  expect(parsed.names.license.en).toContain("Source font license controls use");
  expect(parsed.names.licenseURL?.en?.trim() ?? "").toBe("");
  expect(parsed.charToGlyph("P").advanceWidth).toBeGreaterThan(0);
});

async function getGeneratedFontUrl(page: Page): Promise<string | null> {
  return page.locator("#download-link").getAttribute("data-generated-font-url");
}

type CanvasSignature = {
  width: number;
  height: number;
  darkSamples: number;
  hash: number;
};

async function expectPixelCanvasHasInk(page: Page): Promise<CanvasSignature> {
  const signature = await getPixelCanvasSignature(page);
  expect(signature.width).toBeGreaterThan(0);
  expect(signature.height).toBeGreaterThan(0);
  expect(signature.darkSamples).toBeGreaterThan(12);
  return signature;
}

async function getPixelCanvasSignature(page: Page): Promise<CanvasSignature> {
  return page.locator("#demo-preview-canvas").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const context = element.getContext("2d");
    if (!context) {
      throw new Error("Missing preview canvas context");
    }

    const { data, width, height } = context.getImageData(0, 0, element.width, element.height);
    let darkSamples = 0;
    let hash = 2166136261;
    const stride = 97 * 4;

    for (let index = 0; index < data.length; index += stride) {
      const red = data[index] ?? 255;
      const green = data[index + 1] ?? 255;
      const blue = data[index + 2] ?? 255;
      if (red < 128 && green < 128 && blue < 128) {
        darkSamples += 1;
      }
      hash ^= red + green * 3 + blue * 7 + index;
      hash = Math.imul(hash, 16777619) >>> 0;
    }

    return { width, height, darkSamples, hash };
  });
}

type CanvasLayoutMetrics = {
  cssWidth: number;
  backingCssWidth: number;
  frameClientHeight: number;
  frameScrollHeight: number;
  canvasCssHeight: number;
  bottomDarkSamples: number;
};

type CanvasTypographySyncMetrics = {
  frameWidth: number;
  renderFontSize: number;
  fontSizeDelta: number;
  lineHeightDelta: number;
  paddingLeftDelta: number;
  paddingTopDelta: number;
  canvasWidthDelta: number;
};

type ControlsSpacingMetrics = {
  actionGap: number;
  controlGap: string;
};

type PanelLayoutMetrics = {
  gridColumnCount: number;
  shellPaddingLeft: number;
  shellPaddingRight: number;
  workspaceLeftInset: number;
  workspaceRightInset: number;
  sourceOutputHeightDelta: number;
  sourceControlsHeightDelta: number;
  actionGap: number;
  actionOverflow: number;
};

async function getPanelLayoutMetrics(page: Page): Promise<PanelLayoutMetrics> {
  return page.locator(".workspace").evaluate((workspace) => {
    const shell = document.querySelector(".app-shell");
    const sourcePreview = document.querySelector("#sample-text");
    const outputPreview = document.querySelector("#demo-preview-frame");
    const controlsPanel = document.querySelector(".controls-panel");
    const controlStack = document.querySelector(".control-stack");
    const actionStack = document.querySelector(".action-stack");
    if (!shell || !sourcePreview || !outputPreview || !controlsPanel || !controlStack || !actionStack) {
      throw new Error("Missing panel layout elements");
    }

    const shellBox = shell.getBoundingClientRect();
    const workspaceBox = workspace.getBoundingClientRect();
    const sourceBox = sourcePreview.getBoundingClientRect();
    const outputBox = outputPreview.getBoundingClientRect();
    const controlsBox = controlsPanel.getBoundingClientRect();
    const controlBox = controlStack.getBoundingClientRect();
    const actionBox = actionStack.getBoundingClientRect();
    const shellStyles = getComputedStyle(shell);
    const workspaceStyles = getComputedStyle(workspace);

    return {
      gridColumnCount: workspaceStyles.gridTemplateColumns.split(" ").length,
      shellPaddingLeft: Number.parseFloat(shellStyles.paddingLeft),
      shellPaddingRight: Number.parseFloat(shellStyles.paddingRight),
      workspaceLeftInset: workspaceBox.left - shellBox.left,
      workspaceRightInset: shellBox.right - workspaceBox.right,
      sourceOutputHeightDelta: Math.abs(sourceBox.height - outputBox.height),
      sourceControlsHeightDelta: Math.abs(sourceBox.height - controlsBox.height),
      actionGap: actionBox.top - controlBox.bottom,
      actionOverflow: Math.max(0, actionBox.bottom - controlsBox.bottom),
    };
  });
}

async function getControlsSpacingMetrics(page: Page): Promise<ControlsSpacingMetrics> {
  return page.locator(".controls-panel").evaluate((panel) => {
    const controlStack = panel.querySelector(".control-stack");
    const actionStack = panel.querySelector(".action-stack");
    if (!(controlStack instanceof HTMLElement) || !(actionStack instanceof HTMLElement)) {
      throw new Error("Missing control/action stack");
    }

    const controlBox = controlStack.getBoundingClientRect();
    const actionBox = actionStack.getBoundingClientRect();

    return {
      actionGap: actionBox.top - controlBox.bottom,
      controlGap: getComputedStyle(controlStack).rowGap,
    };
  });
}

async function expectCanvasTypographySynced(page: Page): Promise<CanvasTypographySyncMetrics> {
  await expect
    .poll(
      async () => {
        const metrics = await getCanvasTypographySyncMetrics(page);
        return (
          metrics.fontSizeDelta < 0.01 &&
          metrics.lineHeightDelta < 0.01 &&
          metrics.paddingLeftDelta < 0.01 &&
          metrics.paddingTopDelta < 0.01 &&
          metrics.canvasWidthDelta < 1
        );
      },
      { timeout: 5_000 },
    )
    .toBe(true);

  return getCanvasTypographySyncMetrics(page);
}

async function getCanvasTypographySyncMetrics(page: Page): Promise<CanvasTypographySyncMetrics> {
  return page.locator("#sample-text").evaluate((source) => {
    const sourceElement = source as HTMLTextAreaElement;
    const frame = document.querySelector("#demo-preview-frame");
    const canvas = document.querySelector("#demo-preview-canvas");
    if (!(frame instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Missing canvas preview elements");
    }

    const dpr = window.devicePixelRatio || 1;
    const sourceStyles = getComputedStyle(sourceElement);
    const sourceFontSize = Number.parseFloat(sourceStyles.fontSize);
    const sourceLineHeight = Number.parseFloat(sourceStyles.lineHeight);
    const sourcePaddingLeft = Number.parseFloat(sourceStyles.paddingLeft);
    const sourcePaddingTop = Number.parseFloat(sourceStyles.paddingTop);
    const renderFontSize = Number(canvas.dataset.renderFontSize);
    const renderLineHeight = Number(canvas.dataset.renderLineHeight);
    const renderPaddingLeft = Number(canvas.dataset.renderPaddingLeft);
    const renderPaddingTop = Number(canvas.dataset.renderPaddingTop);
    const backingCssWidth = canvas.width / dpr;

    return {
      frameWidth: frame.clientWidth,
      renderFontSize,
      fontSizeDelta: Math.abs(sourceFontSize - renderFontSize),
      lineHeightDelta: Math.abs(sourceLineHeight - renderLineHeight),
      paddingLeftDelta: Math.abs(sourcePaddingLeft - renderPaddingLeft),
      paddingTopDelta: Math.abs(sourcePaddingTop - renderPaddingTop),
      canvasWidthDelta: Math.abs(frame.clientWidth - backingCssWidth),
    };
  });
}

async function getPixelCanvasLayoutMetrics(page: Page): Promise<CanvasLayoutMetrics> {
  return page.locator("#demo-preview-canvas").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const frame = document.querySelector("#demo-preview-frame");
    const rect = element.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const context = element.getContext("2d");
    if (!context || !(frame instanceof HTMLElement)) {
      throw new Error("Missing preview canvas context or frame");
    }

    const { data, width, height } = context.getImageData(0, 0, element.width, element.height);
    const lowerStart = Math.max(0, height - Math.round(90 * dpr));
    let bottomDarkSamples = 0;

    for (let y = lowerStart; y < height; y += Math.max(1, Math.round(2 * dpr))) {
      for (let x = 0; x < width; x += Math.max(1, Math.round(2 * dpr))) {
        const index = (y * width + x) * 4;
        const red = data[index] ?? 255;
        const green = data[index + 1] ?? 255;
        const blue = data[index + 2] ?? 255;
        if (red < 128 && green < 128 && blue < 128) {
          bottomDarkSamples += 1;
        }
      }
    }

    return {
      cssWidth: rect.width,
      backingCssWidth: element.width / dpr,
      frameClientHeight: frame.clientHeight,
      frameScrollHeight: frame.scrollHeight,
      canvasCssHeight: rect.height,
      bottomDarkSamples,
    };
  });
}

function readStoredZip(data: Uint8Array): Record<string, Uint8Array> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const entries: Record<string, Uint8Array> = {};
  let offset = 0;

  while (view.getUint32(offset, true) === 0x04034b50) {
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = new TextDecoder().decode(data.subarray(nameStart, nameStart + nameLength));
    entries[name] = data.subarray(dataStart, dataStart + compressedSize);
    offset = dataStart + compressedSize;
  }

  return entries;
}

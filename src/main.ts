import "./styles.css";
import {
  getFontLabel,
  parseFont,
  pixelizeFont,
  type PixelizeResult,
  type PixelizeOptions,
} from "./font-pixelizer";
import type opentype from "opentype.js";

declare global {
  interface Window {
    __fontPixelizerLastBlobUrl?: string;
  }
}

type AppState = {
  sourceMode: SourceMode;
  sourceFont?: opentype.Font;
  sourceFile?: File;
  sourceUrl?: string;
  demoFont?: DemoFontChoice;
  generated?: PixelizeResult;
  generatedUrl?: string;
};

type SourceMode = "google" | "upload";

type DemoFontChoice = {
  family: string;
  cssFamily: string;
  license: "OFL" | "Apache-2.0";
  sourceUrl: string;
};

const DEMO_GOOGLE_FONTS: DemoFontChoice[] = [
  {
    family: "IBM Plex Sans",
    cssFamily: '"IBM Plex Sans", system-ui, sans-serif',
    license: "OFL",
    sourceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsans/IBMPlexSans%5Bwdth%2Cwght%5D.ttf",
  },
  {
    family: "Lato",
    cssFamily: '"Lato", system-ui, sans-serif',
    license: "OFL",
    sourceUrl: "https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Regular.ttf",
  },
  {
    family: "Libre Baskerville",
    cssFamily: '"Libre Baskerville", Georgia, serif',
    license: "OFL",
    sourceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/librebaskerville/LibreBaskerville%5Bwght%5D.ttf",
  },
  {
    family: "Merriweather",
    cssFamily: '"Merriweather", Georgia, serif',
    license: "OFL",
    sourceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/merriweather/Merriweather%5Bopsz%2Cwdth%2Cwght%5D.ttf",
  },
  {
    family: "Roboto Mono",
    cssFamily: '"Roboto Mono", ui-monospace, monospace',
    license: "OFL",
    sourceUrl: "https://raw.githubusercontent.com/google/fonts/main/ofl/robotomono/RobotoMono%5Bwght%5D.ttf",
  },
  {
    family: "Space Grotesk",
    cssFamily: '"Space Grotesk", system-ui, sans-serif',
    license: "OFL",
    sourceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf",
  },
];

const state: AppState = {
  sourceMode: "google",
};
const AUTO_GENERATE_DELAY_MS = 280;
let autoGenerateTimer: number | undefined;
let generationRunId = 0;
let sourceLoadRunId = 0;

const uploadInput = getElement<HTMLInputElement>("font-upload");
const uploadZone = getElement<HTMLElement>("upload-zone");
const sourceModeGoogle = getElement<HTMLInputElement>("source-mode-google");
const sourceModeUpload = getElement<HTMLInputElement>("source-mode-upload");
const googleFontField = getElement<HTMLElement>("google-font-field");
const googleFontSelect = getElement<HTMLSelectElement>("google-font-select");
const replaceFontButton = getElement<HTMLButtonElement>("replace-font-button");
const sourceEditorField = getElement<HTMLElement>("source-editor-field");
const resetButton = getElement<HTMLButtonElement>("reset-button");
const downloadLink = getElement<HTMLAnchorElement>("download-link");
const sampleText = getElement<HTMLTextAreaElement>("sample-text");
const afterPreview = getElement<HTMLElement>("after-preview");
const demoPreviewCanvas = getElement<HTMLCanvasElement>("demo-preview-canvas");
const appStatus = getElement<HTMLElement>("app-status");
const pixelsPerEm = getElement<HTMLInputElement>("pixels-per-em");
const threshold = getElement<HTMLInputElement>("threshold");
const expand = getElement<HTMLInputElement>("expand");
const shiftX = getElement<HTMLInputElement>("shift-x");
const shiftY = getElement<HTMLInputElement>("shift-y");
const pixelsPerEmValue = getElement<HTMLOutputElement>("pixels-per-em-value");
const thresholdValue = getElement<HTMLOutputElement>("threshold-value");
const expandValue = getElement<HTMLOutputElement>("expand-value");
const shiftXValue = getElement<HTMLOutputElement>("shift-x-value");
const shiftYValue = getElement<HTMLOutputElement>("shift-y-value");

uploadInput.addEventListener("change", handleUpload);
uploadZone.addEventListener("dragenter", handleDragEnter);
uploadZone.addEventListener("dragover", handleDragOver);
uploadZone.addEventListener("dragleave", handleDragLeave);
uploadZone.addEventListener("drop", handleDrop);
sourceModeGoogle.addEventListener("change", handleSourceModeChange);
sourceModeUpload.addEventListener("change", handleSourceModeChange);
googleFontSelect.addEventListener("change", handleGoogleFontChange);
replaceFontButton.addEventListener("click", handleReplaceFontClick);
resetButton.addEventListener("click", resetControlsToDefaults);
sampleText.addEventListener("input", syncSampleText);
pixelsPerEm.addEventListener("input", handleControlInput);
threshold.addEventListener("input", handleControlInput);
expand.addEventListener("input", handleControlInput);
shiftX.addEventListener("input", handleControlInput);
shiftY.addEventListener("input", handleControlInput);
window.addEventListener("resize", renderDemoPreview);

initializeDemoFonts();
syncSourceModeUI();
syncControlLabels();
syncSampleText();
focusSourceTextAtEnd();
void document.fonts.ready.then(() => {
  renderDemoPreview();
  focusSourceTextAtEnd();
});

async function handleUpload(): Promise<void> {
  const file = uploadInput.files?.[0];
  if (!file) {
    return;
  }

  await loadFontFile(file);
}

function initializeDemoFonts(): void {
  googleFontSelect.replaceChildren(
    ...DEMO_GOOGLE_FONTS.map((font) => {
      const option = document.createElement("option");
      option.value = font.family;
      option.textContent = `${font.family} / ${font.license}`;
      return option;
    }),
  );

  const font = pickRandomFont();
  googleFontSelect.value = font.family;
  void applyDemoFont(font);
}

function handleGoogleFontChange(): void {
  const font = DEMO_GOOGLE_FONTS.find((item) => item.family === googleFontSelect.value);
  if (font) {
    void applyDemoFont(font);
  }
}

function handleReplaceFontClick(): void {
  uploadInput.click();
}

function handleSourceModeChange(): void {
  if (sourceModeGoogle.checked) {
    setSourceMode("google");
  } else {
    setSourceMode("upload");
  }
}

function setSourceMode(mode: SourceMode): void {
  state.sourceMode = mode;

  if (mode === "google") {
    googleFontSelect.disabled = false;
    if (state.sourceFile || !state.sourceFont) {
      clearSourceFont({ keepGenerated: true });
      void applyDemoFont(state.demoFont ?? pickRandomFont());
      setStatus("demo mode");
    } else {
      setStatus(state.generated ? "Generated TTF ready" : "demo mode");
    }
  } else {
    sourceLoadRunId += 1;
    window.clearTimeout(autoGenerateTimer);
    state.sourceFile = undefined;
    uploadInput.value = "";
    googleFontSelect.disabled = true;
    setStatus("Upload a font");
  }

  syncSourceModeUI();

  if (!sourceEditorField.classList.contains("is-hidden")) {
    focusSourceTextAtEnd();
  }
}

async function applyDemoFont(font: DemoFontChoice): Promise<void> {
  state.demoFont = font;

  sampleText.style.fontFamily = font.cssFamily;
  renderDemoPreview();
  void document.fonts.load(`400 48px ${font.cssFamily}`).then(renderDemoPreview);

  if (state.sourceMode === "google") {
    await loadDemoFontFile(font);
  }
}

async function loadDemoFontFile(font: DemoFontChoice): Promise<void> {
  const loadId = (sourceLoadRunId += 1);
  window.clearTimeout(autoGenerateTimer);
  generationRunId += 1;
  revokeUrl(state.sourceUrl);
  state.sourceFont = undefined;
  state.sourceFile = undefined;
  state.sourceUrl = undefined;
  document.getElementById("font-face-SourcePreviewFont")?.remove();
  setStatus(`Loading ${font.family}...`);

  try {
    const response = await fetch(font.sourceUrl);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const sourceFont = parseFont(buffer);
    const sourceUrl = URL.createObjectURL(new Blob([buffer], { type: "font/ttf" }));

    if (loadId !== sourceLoadRunId || state.sourceMode !== "google" || state.demoFont !== font) {
      revokeUrl(sourceUrl);
      return;
    }

    state.sourceFont = sourceFont;
    state.sourceUrl = sourceUrl;
    installFontFace("SourcePreviewFont", sourceUrl);
    sampleText.style.fontFamily = `"SourcePreviewFont", ${font.cssFamily}`;
    syncSourceModeUI();
    focusSourceTextAtEnd();
    await generatePixelFont();
  } catch (error) {
    if (loadId === sourceLoadRunId && state.sourceMode === "google" && state.demoFont === font) {
      renderError(error, `Could not load ${font.family}.`);
    }
  }
}

async function loadFontFile(file: File): Promise<void> {
  sourceLoadRunId += 1;
  window.clearTimeout(autoGenerateTimer);
  generationRunId += 1;
  state.sourceMode = "upload";
  sourceModeUpload.checked = true;
  setStatus("Parsing font...");

  try {
    revokeUrl(state.sourceUrl);

    const buffer = await file.arrayBuffer();
    const sourceFont = parseFont(buffer);
    const sourceUrl = URL.createObjectURL(new Blob([buffer], { type: "font/ttf" }));

    state.sourceFont = sourceFont;
    state.sourceFile = file;
    state.sourceUrl = sourceUrl;

    installFontFace("SourcePreviewFont", sourceUrl);
    sampleText.style.fontFamily = '"SourcePreviewFont", system-ui, sans-serif';

    const label = getFontLabel(sourceFont);
    setStatus(`Generating from ${label}...`);
    googleFontSelect.disabled = true;
    syncSourceModeUI();
    focusSourceTextAtEnd();
    await generatePixelFont();
  } catch (error) {
    renderError(error, "Could not parse this font file.");
  }
}

async function generatePixelFont(): Promise<void> {
  const sourceFont = state.sourceFont;
  if (!sourceFont) {
    return;
  }

  const runId = (generationRunId += 1);
  const previousGeneratedUrl = state.generatedUrl;
  const hasGeneratedPreview = Boolean(state.generated);
  if (!hasGeneratedPreview) {
    clearGeneratedFont();
  }
  setStatus("Generating...");
  if (!hasGeneratedPreview) {
    afterPreview.textContent = "Pixelizing Basic Latin glyphs...";
    afterPreview.classList.add("empty-preview");
  }

  try {
    const generated = await pixelizeFont(sourceFont, getPixelizeOptions(), (done, total) => {
      setStatus(`Generating ${done}/${total}`);
    });

    const blob = new Blob([generated.arrayBuffer], { type: "font/ttf" });
    const url = URL.createObjectURL(blob);

    if (runId !== generationRunId) {
      revokeUrl(url);
      return;
    }

    state.generated = generated;
    state.generatedUrl = url;
    window.__fontPixelizerLastBlobUrl = url;

    installFontFace("PixelizedPreviewFont", url);
    if (previousGeneratedUrl && previousGeneratedUrl !== url) {
      revokeUrl(previousGeneratedUrl);
    }
    afterPreview.style.fontFamily = '"PixelizedPreviewFont", ui-monospace, monospace';
    afterPreview.classList.remove("is-hidden");
    afterPreview.classList.remove("empty-preview");
    demoPreviewCanvas.classList.add("is-hidden");
    downloadLink.href = url;
    downloadLink.download = `${generated.familyName.replace(/\s+/g, "-")}.ttf`;
    downloadLink.classList.remove("is-disabled");
    syncSampleText();
    setStatus("Generated TTF ready");
  } catch (error) {
    if (hasGeneratedPreview) {
      setStatus("Error");
    } else {
      renderError(error, "Could not generate a pixelized TTF.");
    }
  }
}

function syncSourceModeUI(): void {
  const isGoogleMode = state.sourceMode === "google";
  const hasUploadedFont = state.sourceMode === "upload" && Boolean(state.sourceFile);
  const shouldShowUploadZone = state.sourceMode === "upload" && !hasUploadedFont;
  const shouldShowSourceEditor = isGoogleMode || hasUploadedFont;

  sourceModeGoogle.checked = isGoogleMode;
  sourceModeUpload.checked = state.sourceMode === "upload";
  googleFontField.classList.toggle("is-hidden", !isGoogleMode);
  replaceFontButton.classList.toggle("is-hidden", !hasUploadedFont);
  sourceEditorField.classList.toggle("is-hidden", !shouldShowSourceEditor);
  uploadZone.classList.toggle("is-hidden", !shouldShowUploadZone);
  sampleText.disabled = !shouldShowSourceEditor;
}

function syncSampleText(): void {
  const value = sampleText.value || " ";

  if (state.generated) {
    afterPreview.textContent = value;
  } else {
    renderDemoPreview();
  }
}

function handleControlInput(): void {
  syncControlLabels();

  if (state.sourceFont) {
    scheduleAutoGenerate();
  }
}

function resetControlsToDefaults(): void {
  window.clearTimeout(autoGenerateTimer);

  [pixelsPerEm, threshold, expand, shiftX, shiftY].forEach((input) => {
    input.value = input.defaultValue;
  });

  syncControlLabels();

  if (state.sourceFont) {
    void generatePixelFont();
  } else {
    renderDemoPreview();
  }
}

function syncControlLabels(): void {
  pixelsPerEmValue.textContent = pixelsPerEm.value;
  thresholdValue.textContent = `${threshold.value}%`;
  expandValue.textContent = expand.value;
  shiftXValue.textContent = `${formatShiftValue(shiftX.value)} cell`;
  shiftYValue.textContent = `${formatShiftValue(shiftY.value)} cell`;
  syncResetButton();

  if (!state.generated) {
    renderDemoPreview();
  }
}

function syncResetButton(): void {
  resetButton.disabled = [pixelsPerEm, threshold, expand, shiftX, shiftY].every(
    (input) => input.value === input.defaultValue,
  );
}

function scheduleAutoGenerate(): void {
  window.clearTimeout(autoGenerateTimer);
  setStatus(state.generated ? "Updating preview..." : "Auto-generating...");
  autoGenerateTimer = window.setTimeout(() => {
    void generatePixelFont();
  }, AUTO_GENERATE_DELAY_MS);
}

function getPixelizeOptions(): PixelizeOptions {
  return {
    pixelsPerEm: Number(pixelsPerEm.value),
    threshold: Number(threshold.value) / 100,
    expand: Number(expand.value),
    shiftX: Number(shiftX.value),
    shiftY: Number(shiftY.value),
  };
}

function clearGeneratedFont(): void {
  revokeUrl(state.generatedUrl);
  state.generated = undefined;
  state.generatedUrl = undefined;
  window.__fontPixelizerLastBlobUrl = undefined;
  downloadLink.href = "#";
  downloadLink.classList.add("is-disabled");
  afterPreview.style.fontFamily = "";
  afterPreview.classList.add("is-hidden");
  afterPreview.classList.remove("empty-preview");
  afterPreview.textContent = sampleText.value || " ";
  demoPreviewCanvas.classList.remove("is-hidden");
  renderDemoPreview();
}

function clearSourceFont({ keepGenerated = false }: { keepGenerated?: boolean } = {}): void {
  window.clearTimeout(autoGenerateTimer);
  generationRunId += 1;
  revokeUrl(state.sourceUrl);
  state.sourceFont = undefined;
  state.sourceFile = undefined;
  state.sourceUrl = undefined;
  uploadInput.value = "";
  document.getElementById("font-face-SourcePreviewFont")?.remove();
  if (!keepGenerated) {
    clearGeneratedFont();
  }
}

function handleDragEnter(event: DragEvent): void {
  event.preventDefault();
  uploadZone.classList.add("is-dragging");
}

function handleDragOver(event: DragEvent): void {
  event.preventDefault();
  uploadZone.classList.add("is-dragging");
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
}

function handleDragLeave(event: DragEvent): void {
  if (!uploadZone.contains(event.relatedTarget as Node | null)) {
    uploadZone.classList.remove("is-dragging");
  }
}

async function handleDrop(event: DragEvent): Promise<void> {
  event.preventDefault();
  uploadZone.classList.remove("is-dragging");

  const file = event.dataTransfer?.files[0];
  if (!file) {
    return;
  }

  await loadFontFile(file);
}

function renderDemoPreview(): void {
  if (state.generated || demoPreviewCanvas.classList.contains("is-hidden")) {
    return;
  }

  const rect = demoPreviewCanvas.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width || 720));
  const height = Math.max(220, Math.round(rect.height || 280));
  const dpr = window.devicePixelRatio || 1;
  demoPreviewCanvas.width = Math.round(width * dpr);
  demoPreviewCanvas.height = Math.round(height * dpr);

  const context = demoPreviewCanvas.getContext("2d");
  if (!context) {
    return;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) {
    return;
  }

  const options = getPixelizeOptions();
  const previewStyles = getComputedStyle(sampleText);
  const previewFontSize = Number.parseFloat(previewStyles.fontSize) || 42;
  const previewLineHeight = Number.parseFloat(previewStyles.lineHeight) || previewFontSize * 1.12;
  const previewPadding = Number.parseFloat(previewStyles.paddingLeft) || 16;
  const previewFontFamily =
    previewStyles.fontFamily || '"JetBrains Mono", "SFMono-Regular", ui-monospace, monospace';
  const cellSize = Math.max(1, Math.round(previewFontSize / options.pixelsPerEm));
  const shiftXPixels = options.shiftX ? options.shiftX * cellSize : 0;
  const shiftYPixels = options.shiftY ? options.shiftY * cellSize : 0;

  sourceContext.fillStyle = "#ffffff";
  sourceContext.fillRect(0, 0, width, height);
  sourceContext.fillStyle = "#111111";
  sourceContext.font = `${previewFontSize}px ${previewFontFamily}`;
  sourceContext.textBaseline = "top";

  const lines = wrapText(sourceContext, sampleText.value || " ", width - previewPadding * 2);
  lines.slice(0, 5).forEach((line, index) => {
    sourceContext.fillText(
      line,
      previewPadding + shiftXPixels,
      previewPadding + shiftYPixels + index * previewLineHeight,
    );
  });

  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const cells = new Uint8Array(cols * rows);
  const fillThreshold = options.threshold;
  const imageData = sourceContext.getImageData(0, 0, width, height).data;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let darkness = 0;
      let count = 0;

      for (let y = row * cellSize; y < Math.min(height, (row + 1) * cellSize); y += 1) {
        for (let x = col * cellSize; x < Math.min(width, (col + 1) * cellSize); x += 1) {
          const index = (y * width + x) * 4;
          const alpha = imageData[index + 3] / 255;
          const luma = (imageData[index] + imageData[index + 1] + imageData[index + 2]) / (255 * 3);
          darkness += (1 - luma) * alpha;
          count += 1;
        }
      }

      cells[row * cols + col] = darkness / Math.max(1, count) >= fillThreshold ? 1 : 0;
    }
  }

  const expanded = expandCells(cells, cols, rows, options.expand);
  context.fillStyle = "#111111";

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (expanded[row * cols + col] === 1) {
        context.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  }
}

function wrapText(context: CanvasRenderingContext2D, value: string, maxWidth: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words.length > 0 ? words : [""]) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [" "];
}

function expandCells(cells: Uint8Array, cols: number, rows: number, radius: number): Uint8Array {
  if (radius <= 0) {
    return cells;
  }

  const output = new Uint8Array(cells.length);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (cells[row * cols + col] !== 1) {
        continue;
      }

      for (let y = row - radius; y <= row + radius; y += 1) {
        for (let x = col - radius; x <= col + radius; x += 1) {
          if (x >= 0 && x < cols && y >= 0 && y < rows) {
            output[y * cols + x] = 1;
          }
        }
      }
    }
  }

  return output;
}

function installFontFace(fontFamily: string, url: string): void {
  const styleId = `font-face-${fontFamily}`;
  document.getElementById(styleId)?.remove();
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @font-face {
      font-family: "${fontFamily}";
      src: url("${url}") format("truetype");
      font-display: block;
    }
  `;
  document.head.append(style);
}

function setStatus(message: string): void {
  appStatus.textContent = message;
}

function renderError(error: unknown, fallback: string): void {
  const message = error instanceof Error ? error.message : fallback;
  setStatus("Error");
  downloadLink.classList.add("is-disabled");
  demoPreviewCanvas.classList.add("is-hidden");
  afterPreview.classList.remove("is-hidden");
  afterPreview.classList.add("empty-preview");
  afterPreview.textContent = `${fallback} ${message}`;
}

function revokeUrl(url?: string): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

function formatShiftValue(value: string): string {
  return Number(value).toFixed(2);
}

function pickRandomFont(): DemoFontChoice {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return DEMO_GOOGLE_FONTS[random[0] % DEMO_GOOGLE_FONTS.length];
}

function focusSourceTextAtEnd(): void {
  const end = sampleText.value.length;
  sampleText.focus({ preventScroll: true });
  sampleText.setSelectionRange(end, end);
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
}

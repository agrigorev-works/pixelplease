import "./styles.css";
import {
  getBasicLatinCoverage,
  getFontLabel,
  parseFont,
  pixelizeFont,
  summarizeCoverage,
  type PixelizeResult,
} from "./font-pixelizer";
import type opentype from "opentype.js";

declare global {
  interface Window {
    __fontPixelizerLastBlobUrl?: string;
  }
}

type AppState = {
  sourceFont?: opentype.Font;
  sourceFile?: File;
  sourceUrl?: string;
  generated?: PixelizeResult;
  generatedUrl?: string;
};

const state: AppState = {};

const uploadZone = getElement<HTMLElement>("upload-zone");
const uploadInput = getElement<HTMLInputElement>("font-upload");
const generateButton = getElement<HTMLButtonElement>("generate-button");
const downloadLink = getElement<HTMLAnchorElement>("download-link");
const sampleText = getElement<HTMLTextAreaElement>("sample-text");
const beforePreview = getElement<HTMLElement>("before-preview");
const afterPreview = getElement<HTMLElement>("after-preview");
const demoPreviewCanvas = getElement<HTMLCanvasElement>("demo-preview-canvas");
const beforeLabel = getElement<HTMLElement>("before-label");
const afterLabel = getElement<HTMLElement>("after-label");
const appStatus = getElement<HTMLElement>("app-status");
const fontSummary = getElement<HTMLElement>("font-summary");
const coverageLabel = getElement<HTMLElement>("coverage-label");
const glyphGrid = getElement<HTMLElement>("glyph-grid");
const pixelsPerEm = getElement<HTMLInputElement>("pixels-per-em");
const threshold = getElement<HTMLInputElement>("threshold");
const expand = getElement<HTMLInputElement>("expand");
const pixelsPerEmValue = getElement<HTMLOutputElement>("pixels-per-em-value");
const thresholdValue = getElement<HTMLOutputElement>("threshold-value");
const expandValue = getElement<HTMLOutputElement>("expand-value");

uploadInput.addEventListener("change", handleUpload);
uploadZone.addEventListener("dragenter", handleDragEnter);
uploadZone.addEventListener("dragover", handleDragOver);
uploadZone.addEventListener("dragleave", handleDragLeave);
uploadZone.addEventListener("drop", handleDrop);
generateButton.addEventListener("click", handleGenerate);
sampleText.addEventListener("input", syncSampleText);
pixelsPerEm.addEventListener("input", syncControlLabels);
threshold.addEventListener("input", syncControlLabels);
expand.addEventListener("input", syncControlLabels);
window.addEventListener("resize", renderDemoPreview);

syncControlLabels();
syncSampleText();
void document.fonts.ready.then(renderDemoPreview);

async function handleUpload(): Promise<void> {
  const file = uploadInput.files?.[0];
  if (!file) {
    return;
  }

  await loadFontFile(file);
}

async function loadFontFile(file: File): Promise<void> {
  setStatus("Parsing font...");

  try {
    clearGeneratedFont();
    revokeUrl(state.sourceUrl);

    const buffer = await file.arrayBuffer();
    const sourceFont = parseFont(buffer);
    const sourceUrl = URL.createObjectURL(new Blob([buffer], { type: "font/ttf" }));

    state.sourceFont = sourceFont;
    state.sourceFile = file;
    state.sourceUrl = sourceUrl;

    installFontFace("SourcePreviewFont", sourceUrl);
    beforePreview.style.fontFamily = '"SourcePreviewFont", system-ui, sans-serif';

    const label = getFontLabel(sourceFont);
    beforeLabel.textContent = label;
    afterLabel.textContent = "generate TTF to preview font output";
    renderCoverage(sourceFont);
    generateButton.disabled = false;
    setStatus("Ready to generate");
  } catch (error) {
    generateButton.disabled = true;
    renderError(error, "Could not parse this font file.");
  }
}

async function handleGenerate(): Promise<void> {
  if (!state.sourceFont) {
    return;
  }

  const options = {
    pixelsPerEm: Number(pixelsPerEm.value),
    threshold: Number(threshold.value) / 100,
    expand: Number(expand.value),
  };

  generateButton.disabled = true;
  clearGeneratedFont();
  setStatus("Generating...");
  afterPreview.textContent = "Pixelizing Basic Latin glyphs...";
  afterPreview.classList.add("empty-preview");

  try {
    const generated = await pixelizeFont(state.sourceFont, options, (done, total) => {
      setStatus(`Generating ${done}/${total}`);
    });

    const blob = new Blob([generated.arrayBuffer], { type: "font/ttf" });
    const url = URL.createObjectURL(blob);

    state.generated = generated;
    state.generatedUrl = url;
    window.__fontPixelizerLastBlobUrl = url;

    installFontFace("PixelizedPreviewFont", url);
    afterPreview.style.fontFamily = '"PixelizedPreviewFont", ui-monospace, monospace';
    afterPreview.classList.remove("is-hidden");
    demoPreviewCanvas.classList.add("is-hidden");
    afterLabel.textContent = `${generated.familyName} (${generated.glyphCount} glyphs)`;
    downloadLink.href = url;
    downloadLink.download = `${generated.familyName.replace(/\s+/g, "-")}.ttf`;
    downloadLink.classList.remove("is-disabled");
    syncSampleText();
    setStatus("Generated TTF ready");
  } catch (error) {
    renderError(error, "Could not generate a pixelized TTF.");
  } finally {
    generateButton.disabled = false;
  }
}

function renderCoverage(font: opentype.Font): void {
  const coverage = getBasicLatinCoverage(font);
  const supported = coverage.filter((item) => item.supported).length;
  const label = getFontLabel(font);

  fontSummary.innerHTML = `
    <span><strong>${escapeHtml(label)}</strong></span>
    <span>${font.glyphs.length} source glyphs</span>
    <span>${summarizeCoverage(coverage)}</span>
  `;
  coverageLabel.textContent = `${supported} supported characters in Basic Latin.`;
  glyphGrid.replaceChildren(
    ...coverage.map((item) => {
      const tile = document.createElement("span");
      tile.className = `glyph-tile ${item.supported ? "is-supported" : "is-missing"}`;
      tile.textContent = item.char === " " ? "space" : item.char;
      tile.title = `U+${item.codePoint.toString(16).toUpperCase().padStart(4, "0")} / glyph ${item.glyphIndex}`;
      return tile;
    }),
  );
}

function syncSampleText(): void {
  const value = sampleText.value || " ";
  beforePreview.textContent = value;

  if (state.generated) {
    afterPreview.textContent = value;
  } else {
    renderDemoPreview();
  }
}

function syncControlLabels(): void {
  pixelsPerEmValue.textContent = pixelsPerEm.value;
  thresholdValue.textContent = `${threshold.value}%`;
  expandValue.textContent = expand.value;

  if (!state.generated) {
    renderDemoPreview();
  }
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
  afterPreview.textContent = sampleText.value || " ";
  demoPreviewCanvas.classList.remove("is-hidden");
  afterLabel.textContent = state.sourceFont ? "generate TTF to preview font output" : "live demo effect";
  renderDemoPreview();
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

  sourceContext.fillStyle = "#ffffff";
  sourceContext.fillRect(0, 0, width, height);
  sourceContext.fillStyle = "#111111";
  sourceContext.font = '42px "JetBrains Mono", "SFMono-Regular", ui-monospace, monospace';
  sourceContext.textBaseline = "top";

  const lines = wrapText(sourceContext, sampleText.value || " ", width - 36);
  lines.slice(0, 5).forEach((line, index) => {
    sourceContext.fillText(line, 18, 18 + index * 52);
  });

  const cellSize = Math.max(1, Math.round(42 / Number(pixelsPerEm.value)));
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const cells = new Uint8Array(cols * rows);
  const thresholdValue = Number(threshold.value) / 100;
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

      cells[row * cols + col] = darkness / Math.max(1, count) >= thresholdValue ? 1 : 0;
    }
  }

  const expanded = expandCells(cells, cols, rows, Number(expand.value));
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
  fontSummary.innerHTML = `<span class="error-text">${escapeHtml(fallback)} ${escapeHtml(message)}</span>`;
}

function revokeUrl(url?: string): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
}

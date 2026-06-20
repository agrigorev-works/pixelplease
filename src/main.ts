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

const uploadInput = getElement<HTMLInputElement>("font-upload");
const generateButton = getElement<HTMLButtonElement>("generate-button");
const downloadLink = getElement<HTMLAnchorElement>("download-link");
const sampleText = getElement<HTMLTextAreaElement>("sample-text");
const beforePreview = getElement<HTMLElement>("before-preview");
const afterPreview = getElement<HTMLElement>("after-preview");
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
generateButton.addEventListener("click", handleGenerate);
sampleText.addEventListener("input", syncSampleText);
pixelsPerEm.addEventListener("input", syncControlLabels);
threshold.addEventListener("input", syncControlLabels);
expand.addEventListener("input", syncControlLabels);

syncControlLabels();
syncSampleText();

async function handleUpload(): Promise<void> {
  const file = uploadInput.files?.[0];
  if (!file) {
    return;
  }

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
    afterPreview.classList.remove("empty-preview");
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
  }
}

function syncControlLabels(): void {
  pixelsPerEmValue.textContent = pixelsPerEm.value;
  thresholdValue.textContent = `${threshold.value}%`;
  expandValue.textContent = expand.value;
}

function clearGeneratedFont(): void {
  revokeUrl(state.generatedUrl);
  state.generated = undefined;
  state.generatedUrl = undefined;
  window.__fontPixelizerLastBlobUrl = undefined;
  downloadLink.href = "#";
  downloadLink.classList.add("is-disabled");
  afterPreview.style.fontFamily = "";
  afterPreview.classList.add("empty-preview");
  afterPreview.textContent = "Generate a font to preview it here.";
  afterLabel.textContent = "Pixelized output";
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

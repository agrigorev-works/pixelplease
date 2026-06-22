import "./interface-styles.css";
import {
  getFontLabel,
  parseFont,
  pixelizeFont,
  type PixelizeResult,
  type PixelizeOptions,
} from "./font-pixelizer";
import { createCellMaskFromImageData, expandCellMask, isCellFilled } from "./pixel-grid";
import {
  buildNoticeText,
  createDownloadPackage,
  makePackageFileName,
  makeTtfFileName,
  type DownloadPackageFile,
  type NoticeSourceInfo,
} from "./download-package";
import { UI_COPY } from "./interface-copy";
import type opentype from "opentype.js";

type AppState = {
  source: SourceState;
  generated?: PixelizeResult;
  generatedSource?: ActiveSource;
  generatedUrl?: string;
  generatedPackageUrl?: string;
};

type SourceMode = "google" | "upload";

type DemoFontChoice = {
  family: string;
  cssFamily: string;
  license: "OFL" | "Apache-2.0";
  licenseFileName: string;
  licenseUrl: string;
  sourceUrl: string;
  sourceReferenceUrl: string;
};

type GoogleSource = {
  kind: "google";
  demoFont: DemoFontChoice;
  sourceFont: opentype.Font;
  sourceUrl: string;
};

type UploadedSource = {
  kind: "upload";
  file: File;
  sourceFont: opentype.Font;
  sourceUrl: string;
};

type ActiveSource = GoogleSource | UploadedSource;

type SourceState =
  | {
      mode: "google";
      selectedDemoFont: DemoFontChoice;
      googleSource?: GoogleSource;
      uploadedSource?: UploadedSource;
    }
  | {
      mode: "upload";
      selectedDemoFont: DemoFontChoice;
      googleSource?: GoogleSource;
      uploadedSource?: UploadedSource;
    };

const OFL_LICENSE_URL = "https://openfontlicense.org";
const SOURCE_LICENSE_PACKAGE_DIR = "licenses";

const DEMO_GOOGLE_FONTS: DemoFontChoice[] = [
  {
    family: "IBM Plex Sans",
    cssFamily: '"IBM Plex Sans", system-ui, sans-serif',
    license: "OFL",
    licenseFileName: "ibmplexsans-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl:
      "/fonts/google/ibmplexsans/IBMPlexSans-var.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsans/IBMPlexSans%5Bwdth%2Cwght%5D.ttf",
  },
  {
    family: "Lato",
    cssFamily: '"Lato", system-ui, sans-serif',
    license: "OFL",
    licenseFileName: "lato-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/lato/Lato-Regular.ttf",
    sourceReferenceUrl: "https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Regular.ttf",
  },
  {
    family: "Libre Baskerville",
    cssFamily: '"Libre Baskerville", Georgia, serif',
    license: "OFL",
    licenseFileName: "librebaskerville-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl:
      "/fonts/google/librebaskerville/LibreBaskerville-var.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/librebaskerville/LibreBaskerville%5Bwght%5D.ttf",
  },
  {
    family: "Merriweather",
    cssFamily: '"Merriweather", Georgia, serif',
    license: "OFL",
    licenseFileName: "merriweather-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl:
      "/fonts/google/merriweather/Merriweather-var.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/merriweather/Merriweather%5Bopsz%2Cwdth%2Cwght%5D.ttf",
  },
  {
    family: "Roboto Mono",
    cssFamily: '"Roboto Mono", ui-monospace, monospace',
    license: "OFL",
    licenseFileName: "robotomono-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/robotomono/RobotoMono-var.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/robotomono/RobotoMono%5Bwght%5D.ttf",
  },
  {
    family: "Space Grotesk",
    cssFamily: '"Space Grotesk", system-ui, sans-serif',
    license: "OFL",
    licenseFileName: "spacegrotesk-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl:
      "/fonts/google/spacegrotesk/SpaceGrotesk-var.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf",
  },
];

const AUTO_GENERATE_DELAY_MS = 280;
const FONT_FETCH_TIMEOUT_MS = 15_000;
const DEFAULT_DEMO_FONT_FAMILY = "Merriweather";
const LOGO_FONT_FAMILY = "PixelpleaseLogoFont";
const LOGO_SOURCE_FAMILY = DEFAULT_DEMO_FONT_FAMILY;
let autoGenerateTimer: number | undefined;
let generationRunId = 0;
let sourceLoadRunId = 0;

const state: AppState = {
  source: {
    mode: "google",
    selectedDemoFont: getDefaultDemoFont(),
  },
};

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
const logoTitle = getElement<HTMLHeadingElement>("logo-title");
const introCopy = getSelector<HTMLElement>(".intro-copy");
const siteFooter = getSelector<HTMLElement>(".site-footer");
const footerCopy = getSelector<HTMLElement>(".footer-copy");
const sourcePanel = getSelector<HTMLElement>(".source-panel");
const sourceModeControl = getSelector<HTMLFieldSetElement>(".source-mode-control");
const sourceModeLegend = getSelector<HTMLElement>(".source-mode-control legend");
const outputPanel = getSelector<HTMLElement>(".output-panel");
const controlsPanel = getSelector<HTMLElement>(".controls-panel");
const sampleText = getElement<HTMLTextAreaElement>("sample-text");
const afterPreview = getElement<HTMLElement>("after-preview");
const demoPreviewFrame = getElement<HTMLElement>("demo-preview-frame");
const demoPreviewCanvas = getElement<HTMLCanvasElement>("demo-preview-canvas");
const appStatus = getElement<HTMLElement>("app-status");
const sourceEditorLabel = getSelector<HTMLElement>("#source-editor-field .sr-only");
const uploadTitle = getSelector<HTMLElement>(".upload-title");
const licenseReminder = getSelector<HTMLElement>(".license-reminder");
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
const logoParts = Array.from(logoTitle.querySelectorAll<HTMLElement>("span"));
const sourceModeLabels = Array.from(document.querySelectorAll<HTMLElement>(".segment-option span"));
const controlLabels = Array.from(document.querySelectorAll<HTMLElement>(".field span"));

applyInterfaceCopy();
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
void initializeLogoFont();
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

function applyInterfaceCopy(): void {
  document.title = UI_COPY.documentTitle;
  appStatus.textContent = UI_COPY.status.demoMode;
  logoTitle.setAttribute("aria-label", UI_COPY.intro.logoAriaLabel);
  logoParts.forEach((part, index) => {
    part.textContent = UI_COPY.intro.logoParts[index] ?? "";
  });
  introCopy.textContent = UI_COPY.intro.copy;
  siteFooter.setAttribute("aria-label", UI_COPY.footer.ariaLabel);
  footerCopy.textContent = UI_COPY.footer.lines.join("\n");

  sourcePanel.setAttribute("aria-label", UI_COPY.sections.source);
  sourceModeControl.setAttribute("aria-label", UI_COPY.sections.sourceMode);
  sourceModeLegend.textContent = UI_COPY.sections.sourceMode;
  setText(sourceModeLabels[0], UI_COPY.sourceModes.google, "google source mode label");
  setText(sourceModeLabels[1], UI_COPY.sourceModes.upload, "upload source mode label");
  googleFontSelect.setAttribute("aria-label", UI_COPY.source.googleFontSelect);
  replaceFontButton.textContent = UI_COPY.source.replaceFont;
  sourceEditorLabel.textContent = UI_COPY.source.sampleTextLabel;
  sampleText.defaultValue = UI_COPY.source.sampleTextDefault;
  sampleText.value = UI_COPY.source.sampleTextDefault;
  uploadTitle.textContent = UI_COPY.source.uploadTitle;
  licenseReminder.textContent = UI_COPY.source.licenseReminder;

  outputPanel.setAttribute("aria-label", UI_COPY.sections.pixelizedPreview);
  demoPreviewCanvas.setAttribute("aria-label", UI_COPY.sections.demoPreview);
  afterPreview.textContent = UI_COPY.source.sampleTextDefault;
  controlsPanel.setAttribute("aria-label", UI_COPY.sections.settings);
  setText(controlLabels[0], UI_COPY.controls.pixelsPerEm, "pixels-per-em control label");
  setText(controlLabels[1], UI_COPY.controls.threshold, "threshold control label");
  setText(controlLabels[2], UI_COPY.controls.expand, "expand control label");
  setText(controlLabels[3], UI_COPY.controls.shiftX, "shift-x control label");
  setText(controlLabels[4], UI_COPY.controls.shiftY, "shift-y control label");
  resetButton.textContent = UI_COPY.controls.resetDefaults;
  downloadLink.textContent = UI_COPY.controls.downloadTtf;
  downloadLink.download = UI_COPY.controls.defaultDownloadName;
}

function initializeDemoFonts(): void {
  googleFontSelect.replaceChildren(
    ...DEMO_GOOGLE_FONTS.map((font) => {
      const option = document.createElement("option");
      option.value = font.family;
      option.textContent = `${font.family}${UI_COPY.source.fontOptionSeparator}${font.license}`;
      return option;
    }),
  );

  const font = getDefaultDemoFont();
  googleFontSelect.value = font.family;
  void applyDemoFont(font);
}

async function initializeLogoFont(): Promise<void> {
  const font = DEMO_GOOGLE_FONTS.find((item) => item.family === LOGO_SOURCE_FAMILY);
  if (!font) {
    return;
  }

  try {
    const sourceFont = parseFont(await fetchFontBuffer(font.sourceUrl, font.family));
    const generated = await pixelizeFont(sourceFont, getDefaultPixelizeOptions());
    const url = URL.createObjectURL(new Blob([generated.arrayBuffer], { type: "font/ttf" }));
    installFontFace(LOGO_FONT_FAMILY, url);
    logoTitle.style.fontFamily = `"${LOGO_FONT_FAMILY}", "Merriweather", Georgia, serif`;
    logoTitle.dataset.logoFont = "ready";
  } catch {
    logoTitle.dataset.logoFont = "fallback";
  }
}

function handleGoogleFontChange(): void {
  const font = DEMO_GOOGLE_FONTS.find((item) => item.family === googleFontSelect.value);
  if (font) {
    void applyDemoFont(font);
  }
}

function handleReplaceFontClick(): void {
  uploadInput.value = "";
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
  const modeChanged = state.source.mode !== mode;

  if (modeChanged) {
    window.clearTimeout(autoGenerateTimer);
    cancelSourceLoadRun();
    cancelGenerationRun();
  }

  setSourceModeState(mode);

  if (mode === "google") {
    googleFontSelect.disabled = false;
    if (state.source.googleSource) {
      installSourcePreviewFont(state.source.googleSource);
      if (!state.generated) {
        void generatePixelFont();
      }
      setStatus(state.generated ? UI_COPY.status.generatedReady : UI_COPY.status.demoMode);
    } else {
      void applyDemoFont(state.source.selectedDemoFont);
      setStatus(UI_COPY.status.demoMode);
    }
  } else {
    uploadInput.value = "";
    googleFontSelect.disabled = true;
    if (state.source.uploadedSource) {
      activateUploadedFont();
    } else {
      setStatus(UI_COPY.status.uploadFont);
    }
  }

  syncSourceModeUI();

  if (!sourceEditorField.classList.contains("is-hidden")) {
    focusSourceTextAtEnd();
  }
}

async function applyDemoFont(font: DemoFontChoice): Promise<void> {
  state.source.selectedDemoFont = font;

  sampleText.style.fontFamily = font.cssFamily;
  renderDemoPreview();
  void document.fonts.load(`400 48px ${font.cssFamily}`).then(renderDemoPreview);

  if (state.source.mode === "google") {
    await loadDemoFontFile(font);
  }
}

async function loadDemoFontFile(font: DemoFontChoice): Promise<void> {
  const loadRun = startSourceLoadRun();
  window.clearTimeout(autoGenerateTimer);
  cancelGenerationRun();
  clearGoogleSource();
  document.getElementById("font-face-SourcePreviewFont")?.remove();
  setStatus(UI_COPY.dynamicStatus.loadingFont(font.family));

  try {
    const buffer = await fetchFontBuffer(font.sourceUrl, font.family);
    const sourceFont = parseFont(buffer);
    const sourceUrl = URL.createObjectURL(new Blob([buffer], { type: "font/ttf" }));

    if (!loadRun.isCurrent() || state.source.mode !== "google" || state.source.selectedDemoFont !== font) {
      revokeUrl(sourceUrl);
      return;
    }

    state.source.googleSource = {
      kind: "google",
      demoFont: font,
      sourceFont,
      sourceUrl,
    };
    installSourcePreviewFont(state.source.googleSource);
    syncSourceModeUI();
    focusSourceTextAtEnd();
    await generatePixelFont();
  } catch (error) {
    if (loadRun.isCurrent() && state.source.mode === "google" && state.source.selectedDemoFont === font) {
      renderError(error, UI_COPY.errors.couldNotLoadFont(font.family));
    }
  }
}

async function loadFontFile(file: File): Promise<void> {
  const loadRun = startSourceLoadRun();
  window.clearTimeout(autoGenerateTimer);
  cancelGenerationRun();
  setSourceModeState("upload");
  sourceModeUpload.checked = true;
  setStatus(UI_COPY.status.parsingFont);

  try {
    const buffer = await file.arrayBuffer();
    if (!loadRun.isCurrent()) {
      return;
    }

    const sourceFont = parseFont(buffer);
    const sourceUrl = URL.createObjectURL(new Blob([buffer], { type: "font/ttf" }));
    const previousUploadedUrl = state.source.uploadedSource?.sourceUrl;

    if (!loadRun.isCurrent()) {
      revokeUrl(sourceUrl);
      return;
    }

    if (previousUploadedUrl && previousUploadedUrl !== sourceUrl) {
      revokeUrl(previousUploadedUrl);
    }

    state.source.uploadedSource = {
      kind: "upload",
      file,
      sourceFont,
      sourceUrl,
    };

    installSourcePreviewFont(state.source.uploadedSource);

    const label = getFontLabel(sourceFont);
    setStatus(UI_COPY.dynamicStatus.generatingFrom(label));
    googleFontSelect.disabled = true;
    syncSourceModeUI();
    focusSourceTextAtEnd();
    await generatePixelFont();
  } catch (error) {
    if (loadRun.isCurrent()) {
      renderError(error, UI_COPY.errors.couldNotParseFont);
    }
  }
}

async function generatePixelFont(): Promise<void> {
  const generationSource = getGenerationSource();
  if (!generationSource) {
    return;
  }

  const run = startGenerationRun();
  const previousGeneratedUrl = state.generatedUrl;
  const previousGeneratedPackageUrl = state.generatedPackageUrl;
  const hasGeneratedPreview = Boolean(state.generated);
  if (!hasGeneratedPreview) {
    clearGeneratedFont();
  }
  setStatus(UI_COPY.status.generating);
  if (!hasGeneratedPreview) {
    afterPreview.textContent = UI_COPY.status.pixelizingBasicLatin;
    afterPreview.classList.add("empty-preview");
  }

  try {
    const generated = await pixelizeFont(
      generationSource.sourceFont,
      getPixelizeOptions(),
      (done, total) => {
        if (run.isCurrent()) {
          setStatus(UI_COPY.dynamicStatus.generatingProgress(done, total));
        }
      },
      getPixelizeMetadata(generationSource),
    );

    const blob = new Blob([generated.arrayBuffer], { type: "font/ttf" });
    const url = URL.createObjectURL(blob);
    const packageBlob = createDownloadPackage(await buildDownloadPackageFiles(generated, generationSource));
    const packageUrl = URL.createObjectURL(packageBlob);

    if (!run.isCurrent()) {
      revokeUrl(url);
      revokeUrl(packageUrl);
      return;
    }

    state.generated = generated;
    state.generatedSource = generationSource;
    state.generatedUrl = url;
    state.generatedPackageUrl = packageUrl;
    downloadLink.dataset.generatedFontUrl = url;

    installFontFace("PixelizedPreviewFont", url);
    if (previousGeneratedUrl && previousGeneratedUrl !== url) {
      revokeUrl(previousGeneratedUrl);
    }
    if (previousGeneratedPackageUrl && previousGeneratedPackageUrl !== packageUrl) {
      revokeUrl(previousGeneratedPackageUrl);
    }
    afterPreview.style.fontFamily = '"PixelizedPreviewFont", ui-monospace, monospace';
    afterPreview.classList.add("is-hidden");
    afterPreview.classList.remove("empty-preview");
    demoPreviewFrame.classList.remove("is-hidden");
    demoPreviewCanvas.classList.remove("is-hidden");
    downloadLink.href = packageUrl;
    downloadLink.download = makePackageFileName(generated.familyName);
    downloadLink.classList.remove("is-disabled");
    syncSampleText();
    setStatus(UI_COPY.status.generatedReady);
  } catch (error) {
    if (hasGeneratedPreview) {
      setStatus(UI_COPY.status.error);
    } else {
      renderError(error, UI_COPY.errors.couldNotGenerateTtf);
    }
  }
}

function syncSourceModeUI(): void {
  const isGoogleMode = state.source.mode === "google";
  const hasUploadedFont = state.source.mode === "upload" && Boolean(state.source.uploadedSource);
  const shouldShowUploadZone = state.source.mode === "upload" && !hasUploadedFont;
  const shouldShowSourceEditor = isGoogleMode || hasUploadedFont;

  sourceModeGoogle.checked = isGoogleMode;
  sourceModeUpload.checked = state.source.mode === "upload";
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
  }

  renderDemoPreview();
}

function handleControlInput(): void {
  syncControlLabels();

  if (getGenerationSource()) {
    scheduleAutoGenerate();
  }
}

function resetControlsToDefaults(): void {
  window.clearTimeout(autoGenerateTimer);

  [pixelsPerEm, threshold, expand, shiftX, shiftY].forEach((input) => {
    input.value = input.defaultValue;
  });

  syncControlLabels();

  if (getGenerationSource()) {
    void generatePixelFont();
  } else {
    renderDemoPreview();
  }
}

function syncControlLabels(): void {
  pixelsPerEmValue.textContent = pixelsPerEm.value;
  thresholdValue.textContent = `${threshold.value}${UI_COPY.controls.thresholdUnit}`;
  expandValue.textContent = expand.value;
  shiftXValue.textContent = `${formatShiftValue(shiftX.value)} ${UI_COPY.controls.shiftUnit}`;
  shiftYValue.textContent = `${formatShiftValue(shiftY.value)} ${UI_COPY.controls.shiftUnit}`;
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
  setStatus(state.generated ? UI_COPY.status.updatingPreview : UI_COPY.status.autoGenerating);
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

function getDefaultPixelizeOptions(): PixelizeOptions {
  return {
    pixelsPerEm: Number(pixelsPerEm.defaultValue),
    threshold: Number(threshold.defaultValue) / 100,
    expand: Number(expand.defaultValue),
    shiftX: Number(shiftX.defaultValue),
    shiftY: Number(shiftY.defaultValue),
  };
}

function clearGeneratedFont(): void {
  revokeUrl(state.generatedUrl);
  revokeUrl(state.generatedPackageUrl);
  state.generated = undefined;
  state.generatedSource = undefined;
  state.generatedUrl = undefined;
  state.generatedPackageUrl = undefined;
  delete downloadLink.dataset.generatedFontUrl;
  downloadLink.href = "#";
  downloadLink.classList.add("is-disabled");
  afterPreview.style.fontFamily = "";
  afterPreview.classList.add("is-hidden");
  afterPreview.classList.remove("empty-preview");
  afterPreview.textContent = sampleText.value || " ";
  demoPreviewFrame.classList.remove("is-hidden");
  demoPreviewCanvas.classList.remove("is-hidden");
  renderDemoPreview();
}

function activateUploadedFont(): void {
  const uploadedSource = state.source.uploadedSource;
  if (!uploadedSource) {
    return;
  }

  installSourcePreviewFont(uploadedSource);
  setStatus(UI_COPY.dynamicStatus.generatingFrom(getFontLabel(uploadedSource.sourceFont)));
  syncSourceModeUI();
  focusSourceTextAtEnd();
  void generatePixelFont();
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
  if (demoPreviewFrame.classList.contains("is-hidden") || demoPreviewCanvas.classList.contains("is-hidden")) {
    return;
  }

  const frameRect = demoPreviewFrame.getBoundingClientRect();
  const width = Math.max(1, Math.round(demoPreviewFrame.clientWidth || frameRect.width || 720));
  const visibleHeight = Math.max(1, Math.round(demoPreviewFrame.clientHeight || frameRect.height || 280));
  const source = document.createElement("canvas");
  source.width = width;
  source.height = 1;
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) {
    return;
  }

  const options = getPixelizeOptions();
  const previewStyles = getComputedStyle(sampleText);
  const previewFontSize = Number.parseFloat(previewStyles.fontSize) || 42;
  const previewLineHeight = Number.parseFloat(previewStyles.lineHeight) || previewFontSize * 1.12;
  const previewPaddingLeft = Number.parseFloat(previewStyles.paddingLeft) || 16;
  const previewPaddingRight = Number.parseFloat(previewStyles.paddingRight) || previewPaddingLeft;
  const previewPaddingTop = Number.parseFloat(previewStyles.paddingTop) || previewPaddingLeft;
  const previewPaddingBottom = Number.parseFloat(previewStyles.paddingBottom) || previewPaddingTop;
  const previewFontFamily =
    previewStyles.fontFamily || '"JetBrains Mono", "SFMono-Regular", ui-monospace, monospace';
  const cellSize = Math.max(1, Math.round(previewFontSize / options.pixelsPerEm));
  const shiftXPixels = options.shiftX ? options.shiftX * cellSize : 0;
  const shiftYPixels = options.shiftY ? options.shiftY * cellSize : 0;
  sourceContext.font = `${previewFontSize}px ${previewFontFamily}`;
  const lines = wrapText(sourceContext, sampleText.value || " ", width - previewPaddingLeft - previewPaddingRight);
  const contentHeight = Math.max(
    visibleHeight,
    Math.ceil(previewPaddingTop + Math.max(0, shiftYPixels) + lines.length * previewLineHeight + previewPaddingBottom),
  );
  const dpr = window.devicePixelRatio || 1;

  demoPreviewCanvas.style.height = `${contentHeight}px`;
  demoPreviewCanvas.dataset.renderFontSize = `${previewFontSize}`;
  demoPreviewCanvas.dataset.renderLineHeight = `${previewLineHeight}`;
  demoPreviewCanvas.dataset.renderPaddingLeft = `${previewPaddingLeft}`;
  demoPreviewCanvas.dataset.renderPaddingTop = `${previewPaddingTop}`;
  demoPreviewCanvas.dataset.renderFontFamily = previewFontFamily;
  demoPreviewCanvas.width = Math.round(width * dpr);
  demoPreviewCanvas.height = Math.round(contentHeight * dpr);
  source.height = contentHeight;

  const context = demoPreviewCanvas.getContext("2d");
  if (!context) {
    return;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, contentHeight);

  sourceContext.fillStyle = "#ffffff";
  sourceContext.fillRect(0, 0, width, contentHeight);
  sourceContext.fillStyle = "#111111";
  sourceContext.font = `${previewFontSize}px ${previewFontFamily}`;
  sourceContext.textBaseline = "top";

  lines.forEach((line, index) => {
    sourceContext.fillText(
      line,
      previewPaddingLeft + shiftXPixels,
      previewPaddingTop + shiftYPixels + index * previewLineHeight,
    );
  });

  const mask = createCellMaskFromImageData({
    data: sourceContext.getImageData(0, 0, width, contentHeight).data,
    width,
    height: contentHeight,
    cellSize,
    threshold: options.threshold,
    mode: "darkness",
  });
  const expanded = expandCellMask(mask, options.expand);
  context.fillStyle = "#111111";

  for (let row = 0; row < expanded.rows; row += 1) {
    for (let col = 0; col < expanded.cols; col += 1) {
      if (isCellFilled(expanded, col, row)) {
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
    if (context.measureText(word).width > maxWidth) {
      if (current) {
        lines.push(current);
        current = "";
      }

      const chunks = splitWordByWidth(context, word, maxWidth);
      lines.push(...chunks.slice(0, -1));
      current = chunks.at(-1) ?? "";
      continue;
    }

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

function splitWordByWidth(context: CanvasRenderingContext2D, word: string, maxWidth: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const character of Array.from(word)) {
    const next = `${current}${character}`;
    if (context.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      chunks.push(current);
      current = character;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.length > 0 ? chunks : [word];
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
  setStatus(UI_COPY.status.error);
  downloadLink.classList.add("is-disabled");
  demoPreviewFrame.classList.add("is-hidden");
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

function getSourceNoticeInfo(source: ActiveSource): NoticeSourceInfo {
  if (source.kind === "google") {
    const licensePackagePath = getSourceLicensePackagePath(source.demoFont);
    return {
      sourceName: source.demoFont.family,
      sourceFileName: fileNameFromUrl(source.demoFont.sourceReferenceUrl),
      sourceLicense: source.demoFont.license,
      sourceLicenseFileName: source.demoFont.licenseFileName,
      sourceLicensePackagePath: licensePackagePath,
      sourceUrl: source.demoFont.sourceReferenceUrl,
    };
  }

  return {
    sourceName: getFontLabel(source.sourceFont),
    sourceFileName: source.file.name,
    sourceLicense: "User-provided; rights not verified by pixelplease.",
  };
}

function getPixelizeMetadata(source: ActiveSource): { sourceLicenseUrl?: string } {
  return source.kind === "google" ? { sourceLicenseUrl: source.demoFont.licenseUrl } : {};
}

async function buildDownloadPackageFiles(
  generated: PixelizeResult,
  source: ActiveSource,
): Promise<DownloadPackageFile[]> {
  const sourceNoticeInfo = getSourceNoticeInfo(source);
  const files: DownloadPackageFile[] = [
    { name: makeTtfFileName(generated.familyName), data: generated.arrayBuffer },
    { name: "NOTICE.txt", data: buildNoticeText(generated.familyName, sourceNoticeInfo) },
  ];

  if (source.kind === "google") {
    files.push({
      name: getSourceLicensePackagePath(source.demoFont),
      data: await fetchText(getSourceLicenseUrl(source.demoFont), `${source.demoFont.family} license`),
    });
  }

  return files;
}

function getSourceLicensePackagePath(font: DemoFontChoice): string {
  return `${SOURCE_LICENSE_PACKAGE_DIR}/${font.licenseFileName}`;
}

function getSourceLicenseUrl(font: DemoFontChoice): string {
  return `/fonts/google/licenses/${font.licenseFileName}`;
}

function getActiveSource(): ActiveSource | undefined {
  return state.source.mode === "google" ? state.source.googleSource : state.source.uploadedSource;
}

function getGenerationSource(): ActiveSource | undefined {
  return getActiveSource() ?? state.generatedSource;
}

function setSourceModeState(mode: SourceMode): void {
  state.source =
    mode === "google"
      ? { ...state.source, mode: "google" }
      : { ...state.source, mode: "upload" };
}

function installSourcePreviewFont(source: ActiveSource): void {
  installFontFace("SourcePreviewFont", source.sourceUrl);
  sampleText.style.fontFamily =
    source.kind === "google"
      ? `"SourcePreviewFont", ${source.demoFont.cssFamily}`
      : '"SourcePreviewFont", system-ui, sans-serif';
}

function clearGoogleSource(): void {
  revokeUrl(state.source.googleSource?.sourceUrl);
  state.source.googleSource = undefined;
}

async function fetchFontBuffer(url: string, label: string): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FONT_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.arrayBuffer();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`${label} font fetch timed out.`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchText(url: string, label: string): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FONT_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`${label} fetch timed out.`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function startGenerationRun(): { isCurrent: () => boolean } {
  const runId = (generationRunId += 1);
  return {
    isCurrent: () => runId === generationRunId,
  };
}

function cancelGenerationRun(): void {
  generationRunId += 1;
}

function startSourceLoadRun(): { isCurrent: () => boolean } {
  const runId = (sourceLoadRunId += 1);
  return {
    isCurrent: () => runId === sourceLoadRunId,
  };
}

function cancelSourceLoadRun(): void {
  sourceLoadRunId += 1;
}

function fileNameFromUrl(url: string): string {
  const path = new URL(url).pathname.split("/").pop() || "source-font.ttf";
  return decodeURIComponent(path);
}

function getDefaultDemoFont(): DemoFontChoice {
  const font = DEMO_GOOGLE_FONTS.find((item) => item.family === DEFAULT_DEMO_FONT_FAMILY);
  if (!font) {
    throw new Error(`Missing default demo font: ${DEFAULT_DEMO_FONT_FAMILY}`);
  }
  return font;
}

function focusSourceTextAtEnd(): void {
  const end = sampleText.value.length;
  sampleText.focus({ preventScroll: true });
  sampleText.setSelectionRange(end, end);
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(UI_COPY.errors.missingElement(id));
  }
  return element as T;
}

function getSelector<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(UI_COPY.errors.missingElement(selector));
  }
  return element as T;
}

function setText(element: HTMLElement | undefined, value: string, label: string): void {
  if (!element) {
    throw new Error(UI_COPY.errors.missingElement(label));
  }
  element.textContent = value;
}

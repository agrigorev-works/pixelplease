import "./interface-styles.css";
import { initializeAnalytics } from "./analytics";
import {
  getFontFamilyName,
  getFontLabel,
  getFontStyleName,
  parseFont,
  pixelizeFont,
  type PixelizeFontNames,
  type PixelizeResult,
  type PixelizeOptions,
  type PixelShape,
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

initializeAnalytics();

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
  styles: DemoFontStyleChoice[];
};

type DemoFontStyleChoice = {
  label: string;
  fontWeight: number;
  fontStyle: DemoFontSlant;
  sourceUrl: string;
  sourceReferenceUrl: string;
  sourceFileName: string;
};

type DemoFontSlant = "normal" | "italic";

type GoogleSource = {
  kind: "google";
  demoFont: DemoFontChoice;
  demoStyle: DemoFontStyleChoice;
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

type PointerBurstStart = {
  pointerId: number;
  x: number;
  y: number;
  startedAt: number;
};

type CustomCursorShape = "arrow" | "pointer";

type CustomSelectController = {
  trigger: HTMLButtonElement;
  menu: HTMLElement;
  syncOptions: () => void;
  syncValue: () => void;
  syncDisabled: () => void;
  close: () => void;
};

type DemoFontWeightSpec = {
  label: string;
  fontWeight: number;
};

const OFL_LICENSE_URL = "https://openfontlicense.org";
const SOURCE_LICENSE_PACKAGE_DIR = "licenses";

const INTERACTIVE_CURSOR_SELECTOR = [
  "button:not(:disabled)",
  "a:not(.is-disabled)",
  "label",
  "select:not(:disabled)",
  ".custom-select-trigger:not(:disabled)",
  ".custom-select-option:not(:disabled)",
  "input:not(:disabled)",
  "summary",
  ".faq-item summary",
  ".segment-option",
  ".upload-zone",
  ".field input:not(:disabled)",
  ".size-step:not(:disabled)",
  ".secondary-action:not(:disabled)",
  ".download-action:not(.is-disabled)",
  ".replace-font-button:not(:disabled)",
].join(", ");

const CUSTOM_CURSOR_OFFSETS: Record<CustomCursorShape, { x: number; y: number }> = {
  arrow: { x: 6, y: 4 },
  pointer: { x: 19, y: 6 },
};

function demoFontStyle(
  fontPath: string,
  sourceReferenceUrl: string,
  label: string,
  fontWeight: number,
  fontStyle: DemoFontSlant = "normal",
): DemoFontStyleChoice {
  return {
    label,
    fontWeight,
    fontStyle,
    sourceUrl: fontPath,
    sourceReferenceUrl,
    sourceFileName: fileNameFromUrl(fontPath),
  };
}

function googleFontsRawUrl(fontDir: string, fileName: string): string {
  return `https://raw.githubusercontent.com/google/fonts/main/ofl/${fontDir}/${fileName}`;
}

function demoFontWeightStyles(
  fontDir: string,
  filePrefix: string,
  sourceReferenceUrl: string,
  weights: DemoFontWeightSpec[],
): DemoFontStyleChoice[] {
  return weights.map(({ label, fontWeight }) =>
    demoFontStyle(`/fonts/google/${fontDir}/${filePrefix}-${label}.ttf`, sourceReferenceUrl, label, fontWeight),
  );
}

function demoFontItalicWeightStyles(
  fontDir: string,
  filePrefix: string,
  sourceReferenceUrl: string,
  weights: DemoFontWeightSpec[],
): DemoFontStyleChoice[] {
  return weights.map(({ label, fontWeight }) =>
    demoFontStyle(
      `/fonts/google/${fontDir}/${filePrefix}-${label}Italic.ttf`,
      sourceReferenceUrl,
      `${label} Italic`,
      fontWeight,
      "italic",
    ),
  );
}

function demoStaticFontWeightStyles(
  fontDir: string,
  filePrefix: string,
  weights: DemoFontWeightSpec[],
): DemoFontStyleChoice[] {
  return weights.map(({ label, fontWeight }) => {
    const fileName = `${filePrefix}-${label}.ttf`;
    return demoFontStyle(`/fonts/google/${fontDir}/${fileName}`, googleFontsRawUrl(fontDir, fileName), label, fontWeight);
  });
}

function demoStaticFontItalicWeightStyles(
  fontDir: string,
  filePrefix: string,
  weights: DemoFontWeightSpec[],
): DemoFontStyleChoice[] {
  return weights.map(({ label, fontWeight }) => {
    const localFileName = `${filePrefix}-${label}Italic.ttf`;
    const sourceFileName = label === "Regular" ? `${filePrefix}-Italic.ttf` : localFileName;
    return demoFontStyle(
      `/fonts/google/${fontDir}/${localFileName}`,
      googleFontsRawUrl(fontDir, sourceFileName),
      `${label} Italic`,
      fontWeight,
      "italic",
    );
  });
}

const WEIGHTS_100_TO_900: DemoFontWeightSpec[] = [
  { label: "Thin", fontWeight: 100 },
  { label: "ExtraLight", fontWeight: 200 },
  { label: "Light", fontWeight: 300 },
  { label: "Regular", fontWeight: 400 },
  { label: "Medium", fontWeight: 500 },
  { label: "SemiBold", fontWeight: 600 },
  { label: "Bold", fontWeight: 700 },
  { label: "ExtraBold", fontWeight: 800 },
  { label: "Black", fontWeight: 900 },
];

const WEIGHTS_100_TO_700 = WEIGHTS_100_TO_900.slice(0, 7);
const WEIGHTS_200_TO_700 = WEIGHTS_100_TO_900.slice(1, 7);
const WEIGHTS_300_TO_900 = WEIGHTS_100_TO_900.slice(2);

const WEIGHTS_400_TO_700: DemoFontWeightSpec[] = [
  { label: "Regular", fontWeight: 400 },
  { label: "Medium", fontWeight: 500 },
  { label: "SemiBold", fontWeight: 600 },
  { label: "Bold", fontWeight: 700 },
];

const WEIGHTS_400_TO_900: DemoFontWeightSpec[] = [
  { label: "Regular", fontWeight: 400 },
  { label: "Medium", fontWeight: 500 },
  { label: "SemiBold", fontWeight: 600 },
  { label: "Bold", fontWeight: 700 },
  { label: "ExtraBold", fontWeight: 800 },
  { label: "Black", fontWeight: 900 },
];

const DEMO_GOOGLE_FONTS: DemoFontChoice[] = [
  {
    family: "IBM Plex Sans",
    cssFamily: '"IBM Plex Sans", system-ui, sans-serif',
    license: "OFL",
    licenseFileName: "ibmplexsans-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/ibmplexsans/IBMPlexSans-Regular.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsans/IBMPlexSans%5Bwdth%2Cwght%5D.ttf",
    styles: [
      ...demoFontWeightStyles(
        "ibmplexsans",
        "IBMPlexSans",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsans/IBMPlexSans%5Bwdth%2Cwght%5D.ttf",
        WEIGHTS_100_TO_700,
      ),
      ...demoFontItalicWeightStyles(
        "ibmplexsans",
        "IBMPlexSans",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsans/IBMPlexSans-Italic%5Bwdth%2Cwght%5D.ttf",
        WEIGHTS_100_TO_700,
      ),
    ],
  },
  {
    family: "Lato",
    cssFamily: '"Lato", system-ui, sans-serif',
    license: "OFL",
    licenseFileName: "lato-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/lato/Lato-Regular.ttf",
    sourceReferenceUrl: "https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Regular.ttf",
    styles: [
      ...demoStaticFontWeightStyles("lato", "Lato", WEIGHTS_100_TO_900),
      ...demoStaticFontItalicWeightStyles("lato", "Lato", WEIGHTS_100_TO_900),
    ],
  },
  {
    family: "Libre Baskerville",
    cssFamily: '"Libre Baskerville", Georgia, serif',
    license: "OFL",
    licenseFileName: "librebaskerville-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/librebaskerville/LibreBaskerville-Regular.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/librebaskerville/LibreBaskerville%5Bwght%5D.ttf",
    styles: [
      ...demoFontWeightStyles(
        "librebaskerville",
        "LibreBaskerville",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/librebaskerville/LibreBaskerville%5Bwght%5D.ttf",
        WEIGHTS_400_TO_700,
      ),
      ...demoFontItalicWeightStyles(
        "librebaskerville",
        "LibreBaskerville",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/librebaskerville/LibreBaskerville-Italic%5Bwght%5D.ttf",
        WEIGHTS_400_TO_700,
      ),
    ],
  },
  {
    family: "Merriweather",
    cssFamily: '"Merriweather", Georgia, serif',
    license: "OFL",
    licenseFileName: "merriweather-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/merriweather/Merriweather-Regular.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/merriweather/Merriweather%5Bopsz%2Cwdth%2Cwght%5D.ttf",
    styles: [
      ...demoFontWeightStyles(
        "merriweather",
        "Merriweather",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/merriweather/Merriweather%5Bopsz%2Cwdth%2Cwght%5D.ttf",
        WEIGHTS_300_TO_900,
      ),
      ...demoFontItalicWeightStyles(
        "merriweather",
        "Merriweather",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/merriweather/Merriweather-Italic%5Bopsz%2Cwdth%2Cwght%5D.ttf",
        WEIGHTS_300_TO_900,
      ),
    ],
  },
  {
    family: "Roboto Mono",
    cssFamily: '"Roboto Mono", ui-monospace, monospace',
    license: "OFL",
    licenseFileName: "robotomono-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/robotomono/RobotoMono-Regular.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/robotomono/RobotoMono%5Bwght%5D.ttf",
    styles: [
      ...demoFontWeightStyles(
        "robotomono",
        "RobotoMono",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/robotomono/RobotoMono%5Bwght%5D.ttf",
        WEIGHTS_100_TO_700,
      ),
      ...demoFontItalicWeightStyles(
        "robotomono",
        "RobotoMono",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/robotomono/RobotoMono-Italic%5Bwght%5D.ttf",
        WEIGHTS_100_TO_700,
      ),
    ],
  },
  {
    family: "Space Grotesk",
    cssFamily: '"Space Grotesk", system-ui, sans-serif',
    license: "OFL",
    licenseFileName: "spacegrotesk-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/spacegrotesk/SpaceGrotesk-Regular.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf",
    styles: [
      demoFontStyle(
        "/fonts/google/spacegrotesk/SpaceGrotesk-Light.ttf",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf",
        "Light",
        300,
      ),
      demoFontStyle(
        "/fonts/google/spacegrotesk/SpaceGrotesk-Regular.ttf",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf",
        "Regular",
        400,
      ),
      demoFontStyle(
        "/fonts/google/spacegrotesk/SpaceGrotesk-Medium.ttf",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf",
        "Medium",
        500,
      ),
      demoFontStyle(
        "/fonts/google/spacegrotesk/SpaceGrotesk-Bold.ttf",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf",
        "Bold",
        700,
      ),
    ],
  },
  {
    family: "Stack Sans Text",
    cssFamily: '"Stack Sans Text", system-ui, sans-serif',
    license: "OFL",
    licenseFileName: "stacksanstext-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/stacksanstext/StackSansText-Regular.ttf",
    sourceReferenceUrl: "https://raw.githubusercontent.com/google/fonts/main/ofl/stacksanstext/StackSansText%5Bwght%5D.ttf",
    styles: demoFontWeightStyles(
      "stacksanstext",
      "StackSansText",
      "https://raw.githubusercontent.com/google/fonts/main/ofl/stacksanstext/StackSansText%5Bwght%5D.ttf",
      WEIGHTS_200_TO_700,
    ),
  },
  {
    family: "Inter",
    cssFamily: '"Inter", system-ui, sans-serif',
    license: "OFL",
    licenseFileName: "inter-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/inter/Inter-Regular.ttf",
    sourceReferenceUrl: "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf",
    styles: [
      ...demoFontWeightStyles(
        "inter",
        "Inter",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf",
        WEIGHTS_100_TO_900,
      ),
      ...demoFontItalicWeightStyles(
        "inter",
        "Inter",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter-Italic%5Bopsz%2Cwght%5D.ttf",
        WEIGHTS_100_TO_900,
      ),
    ],
  },
  {
    family: "Instrument Sans",
    cssFamily: '"Instrument Sans", system-ui, sans-serif',
    license: "OFL",
    licenseFileName: "instrumentsans-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/instrumentsans/InstrumentSans-Regular.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentsans/InstrumentSans%5Bwdth%2Cwght%5D.ttf",
    styles: [
      ...demoFontWeightStyles(
        "instrumentsans",
        "InstrumentSans",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentsans/InstrumentSans%5Bwdth%2Cwght%5D.ttf",
        WEIGHTS_400_TO_700,
      ),
      ...demoFontItalicWeightStyles(
        "instrumentsans",
        "InstrumentSans",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentsans/InstrumentSans-Italic%5Bwdth%2Cwght%5D.ttf",
        WEIGHTS_400_TO_700,
      ),
    ],
  },
  {
    family: "Montserrat",
    cssFamily: '"Montserrat", system-ui, sans-serif',
    license: "OFL",
    licenseFileName: "montserrat-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/montserrat/Montserrat-Regular.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf",
    styles: [
      ...demoFontWeightStyles(
        "montserrat",
        "Montserrat",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf",
        WEIGHTS_100_TO_900,
      ),
      ...demoFontItalicWeightStyles(
        "montserrat",
        "Montserrat",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat-Italic%5Bwght%5D.ttf",
        WEIGHTS_100_TO_900,
      ),
    ],
  },
  {
    family: "Alan Sans",
    cssFamily: '"Alan Sans", system-ui, sans-serif',
    license: "OFL",
    licenseFileName: "alansans-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/alansans/AlanSans-Regular.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/alansans/AlanSans%5Bwght%5D.ttf",
    styles: demoFontWeightStyles(
      "alansans",
      "AlanSans",
      "https://raw.githubusercontent.com/google/fonts/main/ofl/alansans/AlanSans%5Bwght%5D.ttf",
      WEIGHTS_300_TO_900,
    ),
  },
  {
    family: "Bebas Neue",
    cssFamily: '"Bebas Neue", Impact, sans-serif',
    license: "OFL",
    licenseFileName: "bebasneue-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/bebasneue/BebasNeue-Regular.ttf",
    sourceReferenceUrl: "https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/BebasNeue-Regular.ttf",
    styles: [
      demoFontStyle(
        "/fonts/google/bebasneue/BebasNeue-Regular.ttf",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/BebasNeue-Regular.ttf",
        "Regular",
        400,
      ),
    ],
  },
  {
    family: "Fraunces",
    cssFamily: '"Fraunces", Georgia, serif',
    license: "OFL",
    licenseFileName: "fraunces-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/fraunces/Fraunces-Regular.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf",
    styles: [
      ...demoFontWeightStyles(
        "fraunces",
        "Fraunces",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf",
        WEIGHTS_100_TO_900,
      ),
      ...demoFontItalicWeightStyles(
        "fraunces",
        "Fraunces",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/Fraunces-Italic%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf",
        WEIGHTS_100_TO_900,
      ),
    ],
  },
  {
    family: "Playfair Display",
    cssFamily: '"Playfair Display", Georgia, serif',
    license: "OFL",
    licenseFileName: "playfairdisplay-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/playfairdisplay/PlayfairDisplay-Regular.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf",
    styles: [
      ...demoFontWeightStyles(
        "playfairdisplay",
        "PlayfairDisplay",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf",
        WEIGHTS_400_TO_900,
      ),
      ...demoFontItalicWeightStyles(
        "playfairdisplay",
        "PlayfairDisplay",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay-Italic%5Bwght%5D.ttf",
        WEIGHTS_400_TO_900,
      ),
    ],
  },
  {
    family: "Geist Mono",
    cssFamily: '"Geist Mono", ui-monospace, monospace',
    license: "OFL",
    licenseFileName: "geistmono-OFL.txt",
    licenseUrl: OFL_LICENSE_URL,
    sourceUrl: "/fonts/google/geistmono/GeistMono-Regular.ttf",
    sourceReferenceUrl:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/geistmono/GeistMono%5Bwght%5D.ttf",
    styles: [
      ...demoFontWeightStyles(
        "geistmono",
        "GeistMono",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/geistmono/GeistMono%5Bwght%5D.ttf",
        WEIGHTS_100_TO_900,
      ),
      ...demoFontItalicWeightStyles(
        "geistmono",
        "GeistMono",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/geistmono/GeistMono-Italic%5Bwght%5D.ttf",
        WEIGHTS_100_TO_900,
      ),
    ],
  },
];

const AUTO_GENERATE_DELAY_MS = 280;
const FONT_FETCH_TIMEOUT_MS = 15_000;
const DEFAULT_DEMO_FONT_FAMILY = "Merriweather";
const GENERATED_FONT_BRAND = "PixelPlease";
const LOGO_FONT_FAMILY = "PixelpleaseLogoFont";
const LOGO_SOURCE_FAMILY = DEFAULT_DEMO_FONT_FAMILY;
const MIN_PREVIEW_FONT_SIZE = 16;
const MAX_PREVIEW_FONT_SIZE = 120;
const PREVIEW_FONT_SIZE_STEP = 2;
const FALLBACK_PREVIEW_FONT_SIZE = 42;
const CLICK_PIXEL_COUNT = 14;
const CLICK_PIXEL_MIN_TRAVEL = 24;
const CLICK_PIXEL_MAX_TRAVEL = 62;
const CLICK_PIXEL_LIFETIME_MS = 780;
const CLICK_PIXEL_MAX_TAP_MS = 280;
const CLICK_PIXEL_MAX_TAP_DRIFT = 8;
const TRAIL_PIXEL_MIN_DISTANCE = 12;
const TRAIL_PIXEL_MIN_INTERVAL_MS = 34;
const TRAIL_PIXEL_LIFETIME_MS = 460;
const TRAIL_PIXEL_MIN_DRIFT = 8;
const TRAIL_PIXEL_MAX_DRIFT = 20;
const SOURCE_CODE_OMITTED_TOKENS = new Set(["ibm"]);
const SOURCE_CODE_PRESERVED_TOKENS = new Set([
  "code",
  "display",
  "grotesk",
  "mono",
  "sans",
  "serif",
  "slab",
  "text",
]);
let autoGenerateTimer: number | undefined;
let generationRunId = 0;
let sourceLoadRunId = 0;
let logoFontRunId = 0;
let logoSourceFont: opentype.Font | undefined;
let logoFontUrl: string | undefined;
let renderedLogoPixelShape: PixelShape | undefined;
// null = follow the responsive default; a number pins an explicit preview size.
// Output size falls back to the source size, so the two controls start linked
// and become fully independent once each is set. Reset returns both to null.
let sourcePreviewFontSize: number | null = null;
let outputPreviewFontSize: number | null = null;

const state: AppState = {
  source: {
    mode: "google",
    selectedDemoFont: getDefaultDemoFont(),
  },
};
let selectedDemoStyle = getDefaultDemoFontStyle(state.source.selectedDemoFont);

const uploadInput = getElement<HTMLInputElement>("font-upload");
const uploadZone = getElement<HTMLElement>("upload-zone");
const sourceModeGoogle = getElement<HTMLInputElement>("source-mode-google");
const sourceModeUpload = getElement<HTMLInputElement>("source-mode-upload");
const googleFontField = getElement<HTMLElement>("google-font-field");
const googleFontSelect = getElement<HTMLSelectElement>("google-font-select");
const googleWeightField = getElement<HTMLElement>("google-weight-field");
const googleWeightSelect = getElement<HTMLSelectElement>("google-weight-select");
const replaceFontButton = getElement<HTMLButtonElement>("replace-font-button");
const sourceEditorField = getElement<HTMLElement>("source-editor-field");
const resetButton = getElement<HTMLButtonElement>("reset-button");
const downloadLink = getElement<HTMLAnchorElement>("download-link");
const logoTitle = getElement<HTMLHeadingElement>("logo-title");
const introCopy = getSelector<HTMLElement>(".intro-copy");
const siteFooter = getSelector<HTMLElement>(".site-footer");
const footerCopy = getSelector<HTMLElement>(".footer-copy");
const creatorFooter = getSelector<HTMLElement>(".creator-footer");
const creatorLink = getSelector<HTMLAnchorElement>(".creator-link");
const sourcePanel = getSelector<HTMLElement>(".source-panel");
const sourceModeControl = getSelector<HTMLFieldSetElement>(".source-mode-control");
const sourceModeLegend = getSelector<HTMLElement>(".source-mode-control legend");
const outputPanel = getSelector<HTMLElement>(".output-panel");
const controlsPanel = getSelector<HTMLElement>(".controls-panel");
const sampleText = getElement<HTMLTextAreaElement>("sample-text");
const afterPreview = getElement<HTMLElement>("after-preview");
const demoPreviewFrame = getElement<HTMLElement>("demo-preview-frame");
const demoPreviewScroll = getElement<HTMLElement>("demo-preview-scroll");
const demoPreviewCanvas = getElement<HTMLCanvasElement>("demo-preview-canvas");
const appStatus = getElement<HTMLElement>("app-status");
const sourceEditorLabel = getSelector<HTMLElement>("#source-editor-field .sr-only");
const uploadTitle = getSelector<HTMLElement>(".upload-title");
const licenseReminder = getSelector<HTMLElement>(".license-reminder");
const pixelsPerEm = getElement<HTMLInputElement>("pixels-per-em");
const threshold = getElement<HTMLInputElement>("threshold");
const expand = getElement<HTMLInputElement>("expand");
const pixelEffectSelect = getElement<HTMLSelectElement>("pixel-effect-select");
const shiftX = getElement<HTMLInputElement>("shift-x");
const shiftY = getElement<HTMLInputElement>("shift-y");
const sourceSizeBar = getElement<HTMLElement>("source-size-bar");
const sourceSizeDecrease = getElement<HTMLButtonElement>("source-size-decrease");
const sourceSizeIncrease = getElement<HTMLButtonElement>("source-size-increase");
const sourceSizeReadout = getElement<HTMLOutputElement>("source-size-readout");
const outputSizeBar = getElement<HTMLElement>("output-size-bar");
const outputSizeDecrease = getElement<HTMLButtonElement>("output-size-decrease");
const outputSizeIncrease = getElement<HTMLButtonElement>("output-size-increase");
const outputSizeReadout = getElement<HTMLOutputElement>("output-size-readout");
const pixelsPerEmValue = getElement<HTMLOutputElement>("pixels-per-em-value");
const thresholdValue = getElement<HTMLOutputElement>("threshold-value");
const expandValue = getElement<HTMLOutputElement>("expand-value");
const shiftXValue = getElement<HTMLOutputElement>("shift-x-value");
const shiftYValue = getElement<HTMLOutputElement>("shift-y-value");
const logoParts = Array.from(logoTitle.querySelectorAll<HTMLElement>("span"));
const sourceModeLabels = Array.from(document.querySelectorAll<HTMLElement>(".source-mode-control .segment-option span"));
const controlLabels = Array.from(document.querySelectorAll<HTMLElement>(".control-stack > .field > span"));
const clickPixelLayer = createClickPixelLayer();
const customCursor = createCustomCursor();
const customSelectControllers: CustomSelectController[] = [];
let pendingClickPixelPointer: PointerBurstStart | null = null;
let lastTrailPixelX: number | undefined;
let lastTrailPixelY: number | undefined;
let lastTrailPixelAt = 0;
let trailPixelIndex = 0;

applyInterfaceCopy();
const googleFontCustomSelect = createCustomSelect(googleFontSelect);
const googleWeightCustomSelect = createCustomSelect(googleWeightSelect);
const pixelEffectCustomSelect = createCustomSelect(pixelEffectSelect);
uploadInput.addEventListener("change", handleUpload);
uploadZone.addEventListener("dragenter", handleDragEnter);
uploadZone.addEventListener("dragover", handleDragOver);
uploadZone.addEventListener("dragleave", handleDragLeave);
uploadZone.addEventListener("drop", handleDrop);
sourceModeGoogle.addEventListener("change", handleSourceModeChange);
sourceModeUpload.addEventListener("change", handleSourceModeChange);
googleFontSelect.addEventListener("change", handleGoogleFontChange);
googleWeightSelect.addEventListener("change", handleGoogleWeightChange);
replaceFontButton.addEventListener("click", handleReplaceFontClick);
resetButton.addEventListener("click", resetControlsToDefaults);
sampleText.addEventListener("input", syncSampleText);
pixelsPerEm.addEventListener("input", handleControlInput);
threshold.addEventListener("input", handleControlInput);
expand.addEventListener("input", handleControlInput);
pixelEffectSelect.addEventListener("change", handleControlInput);
shiftX.addEventListener("input", handleControlInput);
shiftY.addEventListener("input", handleControlInput);
sourceSizeDecrease.addEventListener("click", () => adjustSourcePreviewSize(-PREVIEW_FONT_SIZE_STEP));
sourceSizeIncrease.addEventListener("click", () => adjustSourcePreviewSize(PREVIEW_FONT_SIZE_STEP));
outputSizeDecrease.addEventListener("click", () => adjustOutputPreviewSize(-PREVIEW_FONT_SIZE_STEP));
outputSizeIncrease.addEventListener("click", () => adjustOutputPreviewSize(PREVIEW_FONT_SIZE_STEP));
window.addEventListener("resize", syncPreviewSizes);
window.addEventListener("pointerover", handleCustomCursorMove, { passive: true });
window.addEventListener("pointermove", handleCustomCursorMove, { passive: true });
window.addEventListener("pointerout", handleCustomCursorLeave, { passive: true });
window.addEventListener("pointerdown", handlePointerBurstStart, { passive: true });
window.addEventListener("pointermove", handlePointerTrail, { passive: true });
window.addEventListener("pointerup", handlePointerBurstEnd, { passive: true });
window.addEventListener("pointercancel", clearPendingPointerBurst, { passive: true });
window.addEventListener("blur", resetPointerEffects);

initializeDemoFonts();
void initializeLogoFont();
syncSourceModeUI();
syncControlLabels();
applySourcePreviewSize();
syncPreviewSizes();
syncSampleText();
focusSourceTextAtEndIfSafe();
void document.fonts.ready.then(() => {
  renderDemoPreview();
  syncPreviewSizes();
  focusSourceTextAtEndIfSafe();
});

async function handleUpload(): Promise<void> {
  const file = uploadInput.files?.[0];
  if (!file) {
    return;
  }

  await loadFontFile(file);
}

function createClickPixelLayer(): HTMLElement {
  const layer = document.createElement("div");
  layer.className = "click-pixel-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);
  return layer;
}

function createCustomCursor(): HTMLElement {
  const cursor = document.createElement("div");
  cursor.className = "custom-cursor";
  cursor.dataset.cursorShape = "arrow";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = `
    <svg class="custom-cursor-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="M6 4 L6 35 L15 27 L21 41 L27 38 L21 24 L33 24 Z" fill="#111111" stroke="#ffffff" stroke-width="3" stroke-linejoin="miter"/>
      <path d="M6 4 L6 35 L15 27 L21 41 L27 38 L21 24 L33 24 Z" fill="none" stroke="#111111" stroke-width="1" stroke-linejoin="miter"/>
    </svg>
    <svg class="custom-cursor-pointer" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="M17 5 H24 V24 H26 V13 H32 V26 H34 V19 H40 V33 L34 43 H19 L8 29 L12 25 L17 30 Z" fill="#111111" stroke="#ffffff" stroke-width="3" stroke-linejoin="miter"/>
      <path d="M17 5 H24 V24 H26 V13 H32 V26 H34 V19 H40 V33 L34 43 H19 L8 29 L12 25 L17 30 Z" fill="none" stroke="#111111" stroke-width="1" stroke-linejoin="miter"/>
    </svg>
  `;
  document.body.classList.add("has-custom-cursor");
  document.body.append(cursor);
  return cursor;
}

function createCustomSelect(select: HTMLSelectElement): CustomSelectController {
  const field = select.closest<HTMLElement>(".font-select-field");
  if (!field) {
    throw new Error(UI_COPY.errors.missingElement(`.${select.id}-field`));
  }
  const fieldElement = field;

  select.classList.add("native-select-proxy");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "custom-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", `${select.id}-custom-menu`);

  const selectLabel = select.getAttribute("aria-label");
  if (selectLabel) {
    trigger.setAttribute("aria-label", selectLabel);
  }

  const menu = document.createElement("div");
  menu.id = `${select.id}-custom-menu`;
  menu.className = "custom-select-menu is-hidden";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", selectLabel ?? "");

  const controller: CustomSelectController = {
    trigger,
    menu,
    syncOptions,
    syncValue,
    syncDisabled,
    close,
  };

  function syncOptions(): void {
    menu.replaceChildren(
      ...Array.from(select.options).map((option) => {
        const item = document.createElement("button");
        const label = document.createElement("span");

        item.type = "button";
        item.className = "custom-select-option";
        item.setAttribute("role", "option");
        item.dataset.value = option.value;
        item.title = option.textContent ?? "";
        label.className = "custom-select-option-label";
        label.textContent = option.textContent;
        item.append(label);
        item.addEventListener("click", () => chooseOption(option.value));
        return item;
      }),
    );
    syncValue();
  }

  function syncValue(): void {
    const selectedOption = select.selectedOptions[0] ?? select.options[select.selectedIndex] ?? select.options[0];
    const label = document.createElement("span");
    label.className = "custom-select-trigger-label";
    label.textContent = selectedOption?.textContent ?? "";
    trigger.title = selectedOption?.textContent ?? "";
    trigger.replaceChildren(label);

    for (const option of Array.from(menu.querySelectorAll<HTMLButtonElement>(".custom-select-option"))) {
      const isSelected = option.dataset.value === select.value;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-selected", isSelected ? "true" : "false");
    }

    syncDisabled();
  }

  function syncDisabled(): void {
    trigger.disabled = select.disabled;
    fieldElement.classList.toggle("is-disabled", select.disabled);

    if (select.disabled) {
      close();
    }
  }

  function open(): void {
    if (select.disabled || !menu.classList.contains("is-hidden")) {
      return;
    }

    for (const item of customSelectControllers) {
      if (item !== controller) {
        item.close();
      }
    }

    syncOptions();
    fieldElement.classList.add("is-open");
    menu.classList.remove("is-hidden");
    trigger.setAttribute("aria-expanded", "true");
    const selectedItem = menu.querySelector<HTMLButtonElement>(".custom-select-option.is-selected");
    selectedItem?.scrollIntoView({ block: "nearest" });
  }

  function close(): void {
    fieldElement.classList.remove("is-open");
    menu.classList.add("is-hidden");
    trigger.setAttribute("aria-expanded", "false");
  }

  function chooseOption(value: string): void {
    if (select.disabled) {
      return;
    }

    if (select.value !== value) {
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      syncValue();
    }

    close();
    trigger.focus({ preventScroll: true });
  }

  function focusMenuOption(offset: number): void {
    const options = Array.from(menu.querySelectorAll<HTMLButtonElement>(".custom-select-option"));
    if (options.length === 0) {
      return;
    }

    const currentIndex = Math.max(0, options.indexOf(document.activeElement as HTMLButtonElement));
    const nextIndex = Math.min(options.length - 1, Math.max(0, currentIndex + offset));
    options[nextIndex]?.focus({ preventScroll: true });
  }

  trigger.addEventListener("click", () => {
    if (menu.classList.contains("is-hidden")) {
      open();
    } else {
      close();
    }
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
      const selectedItem = menu.querySelector<HTMLButtonElement>(".custom-select-option.is-selected");
      selectedItem?.focus({ preventScroll: true });
    }
  });

  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      trigger.focus({ preventScroll: true });
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      focusMenuOption(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      const option = document.activeElement;
      if (option instanceof HTMLButtonElement && option.classList.contains("custom-select-option")) {
        event.preventDefault();
        chooseOption(option.dataset.value ?? "");
      }
    }
  });

  select.addEventListener("change", syncValue);

  field.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!fieldElement.contains(document.activeElement)) {
        close();
      }
    }, 0);
  });

  document.addEventListener("pointerdown", (event) => {
    if (event.target instanceof Node && !fieldElement.contains(event.target)) {
      close();
    }
  });

  fieldElement.append(trigger, menu);
  customSelectControllers.push(controller);
  syncOptions();
  return controller;
}

function handleCustomCursorMove(event: PointerEvent): void {
  if (event.pointerType !== "mouse") {
    hideCustomCursor();
    return;
  }

  const shape = getCustomCursorShape(event.target);
  const offset = CUSTOM_CURSOR_OFFSETS[shape];
  customCursor.dataset.cursorShape = shape;
  customCursor.style.setProperty("--cursor-x", `${event.clientX - offset.x}px`);
  customCursor.style.setProperty("--cursor-y", `${event.clientY - offset.y}px`);
  customCursor.classList.add("is-visible");
}

function handleCustomCursorLeave(event: PointerEvent): void {
  if (event.pointerType === "mouse" && !event.relatedTarget) {
    hideCustomCursor();
  }
}

function hideCustomCursor(): void {
  customCursor.classList.remove("is-visible");
}

function getCustomCursorShape(target: EventTarget | null): CustomCursorShape {
  return target instanceof Element && target.closest(INTERACTIVE_CURSOR_SELECTOR) ? "pointer" : "arrow";
}

function handlePointerBurstStart(event: PointerEvent): void {
  if (event.button !== 0 || event.pointerType === "touch") {
    pendingClickPixelPointer = null;
    return;
  }

  pendingClickPixelPointer = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    startedAt: window.performance.now(),
  };
}

function handlePointerTrail(event: PointerEvent): void {
  if (event.pointerType !== "mouse" || event.buttons !== 0) {
    resetPointerTrail();
    return;
  }

  if (lastTrailPixelX === undefined || lastTrailPixelY === undefined) {
    lastTrailPixelX = event.clientX;
    lastTrailPixelY = event.clientY;
    lastTrailPixelAt = window.performance.now();
    return;
  }

  const now = window.performance.now();
  const movementX = event.clientX - lastTrailPixelX;
  const movementY = event.clientY - lastTrailPixelY;
  const movedBy = Math.hypot(movementX, movementY);
  if (movedBy < TRAIL_PIXEL_MIN_DISTANCE || now - lastTrailPixelAt < TRAIL_PIXEL_MIN_INTERVAL_MS) {
    return;
  }

  spawnCursorTrailPixel(event.clientX, event.clientY, movementX, movementY);
  lastTrailPixelX = event.clientX;
  lastTrailPixelY = event.clientY;
  lastTrailPixelAt = now;
}

function handlePointerBurstEnd(event: PointerEvent): void {
  const pointerStart = pendingClickPixelPointer;
  pendingClickPixelPointer = null;

  if (!pointerStart || pointerStart.pointerId !== event.pointerId) {
    return;
  }

  const heldForMs = window.performance.now() - pointerStart.startedAt;
  const movedBy = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
  if (
    heldForMs > CLICK_PIXEL_MAX_TAP_MS ||
    movedBy > CLICK_PIXEL_MAX_TAP_DRIFT ||
    hasActiveTextSelection()
  ) {
    return;
  }

  spawnClickPixels(event.clientX, event.clientY);
}

function clearPendingPointerBurst(): void {
  pendingClickPixelPointer = null;
}

function resetPointerTrail(): void {
  lastTrailPixelX = undefined;
  lastTrailPixelY = undefined;
  lastTrailPixelAt = 0;
}

function resetPointerEffects(): void {
  clearPendingPointerBurst();
  resetPointerTrail();
}

function hasActiveTextSelection(): boolean {
  if ((window.getSelection()?.toString().trim().length ?? 0) > 0) {
    return true;
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
    const selectionStart = activeElement.selectionStart ?? 0;
    const selectionEnd = activeElement.selectionEnd ?? 0;
    return selectionEnd > selectionStart;
  }

  return false;
}

function spawnCursorTrailPixel(x: number, y: number, movementX: number, movementY: number): void {
  const movementLength = Math.hypot(movementX, movementY) || 1;
  const drift = TRAIL_PIXEL_MIN_DRIFT + Math.random() * (TRAIL_PIXEL_MAX_DRIFT - TRAIL_PIXEL_MIN_DRIFT);
  const jitter = (Math.random() - 0.5) * 6;
  const size = 4 + Math.round(Math.random() * 3);
  const pixel = document.createElement("span");
  const isDark = trailPixelIndex % 2 === 0;
  trailPixelIndex += 1;

  pixel.className = `click-pixel cursor-trail-pixel ${isDark ? "is-dark" : "is-light"}`;
  pixel.style.setProperty("--x", `${x}px`);
  pixel.style.setProperty("--y", `${y}px`);
  pixel.style.setProperty("--dx", `${(-movementX / movementLength) * drift + jitter}px`);
  pixel.style.setProperty("--dy", `${(-movementY / movementLength) * drift + jitter}px`);
  pixel.style.setProperty("--size", `${size}px`);
  clickPixelLayer.append(pixel);

  window.setTimeout(() => {
    pixel.remove();
  }, TRAIL_PIXEL_LIFETIME_MS);
}

function spawnClickPixels(x: number, y: number): void {
  for (let index = 0; index < CLICK_PIXEL_COUNT; index += 1) {
    const angle = (Math.PI * 2 * index) / CLICK_PIXEL_COUNT + (Math.random() - 0.5) * 0.58;
    const distance =
      CLICK_PIXEL_MIN_TRAVEL + Math.random() * (CLICK_PIXEL_MAX_TRAVEL - CLICK_PIXEL_MIN_TRAVEL);
    const size = 5 + Math.round(Math.random() * 3);
    const pixel = document.createElement("span");

    pixel.className = `click-pixel ${index % 2 === 0 ? "is-dark" : "is-light"}`;
    pixel.style.setProperty("--x", `${x}px`);
    pixel.style.setProperty("--y", `${y}px`);
    pixel.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    pixel.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    pixel.style.setProperty("--size", `${size}px`);
    clickPixelLayer.append(pixel);

    window.setTimeout(() => {
      pixel.remove();
    }, CLICK_PIXEL_LIFETIME_MS);
  }
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
  creatorFooter.setAttribute("aria-label", UI_COPY.credit.ariaLabel);
  creatorLink.textContent = UI_COPY.credit.label;
  creatorLink.href = UI_COPY.credit.href;

  sourcePanel.setAttribute("aria-label", UI_COPY.sections.source);
  sourceModeControl.setAttribute("aria-label", UI_COPY.sections.sourceMode);
  sourceModeLegend.textContent = UI_COPY.sections.sourceMode;
  setText(sourceModeLabels[0], UI_COPY.sourceModes.google, "google source mode label");
  setText(sourceModeLabels[1], UI_COPY.sourceModes.upload, "upload source mode label");
  googleFontSelect.setAttribute("aria-label", UI_COPY.source.googleFontSelect);
  googleWeightSelect.setAttribute("aria-label", UI_COPY.source.googleWeightSelect);
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
  pixelEffectSelect.setAttribute("aria-label", UI_COPY.controls.pixelEffect);
  setPixelEffectOptionCopy("square", UI_COPY.controls.squarePixels);
  setPixelEffectOptionCopy("round", UI_COPY.controls.roundPixels);
  setPixelEffectOptionCopy("vertical-lines", UI_COPY.controls.verticalLines);
  setPixelEffectOptionCopy("horizontal-lines", UI_COPY.controls.horizontalLines);
  resetButton.textContent = UI_COPY.controls.resetDefaults;
  downloadLink.textContent = UI_COPY.controls.downloadTtf;
  downloadLink.download = UI_COPY.controls.defaultDownloadName;

  sourceSizeBar.setAttribute("aria-label", UI_COPY.controls.sourceSizeGroup);
  sourceSizeDecrease.textContent = UI_COPY.controls.sizeDecreaseSymbol;
  sourceSizeDecrease.setAttribute("aria-label", UI_COPY.controls.sourceSizeDecrease);
  sourceSizeIncrease.textContent = UI_COPY.controls.sizeIncreaseSymbol;
  sourceSizeIncrease.setAttribute("aria-label", UI_COPY.controls.sourceSizeIncrease);
  outputSizeBar.setAttribute("aria-label", UI_COPY.controls.outputSizeGroup);
  outputSizeDecrease.textContent = UI_COPY.controls.sizeDecreaseSymbol;
  outputSizeDecrease.setAttribute("aria-label", UI_COPY.controls.outputSizeDecrease);
  outputSizeIncrease.textContent = UI_COPY.controls.sizeIncreaseSymbol;
  outputSizeIncrease.setAttribute("aria-label", UI_COPY.controls.outputSizeIncrease);
}

function initializeDemoFonts(): void {
  googleFontSelect.replaceChildren(
    ...DEMO_GOOGLE_FONTS.map((font) => {
      const option = document.createElement("option");
      option.value = font.family;
      option.textContent = font.family;
      return option;
    }),
  );

  const font = getDefaultDemoFont();
  const style = getDefaultDemoFontStyle(font);
  googleFontSelect.value = font.family;
  syncGoogleWeightOptions(font, style);
  googleFontCustomSelect.syncOptions();
  void applyDemoFont(font, style);
}

async function initializeLogoFont(): Promise<void> {
  const font = DEMO_GOOGLE_FONTS.find((item) => item.family === LOGO_SOURCE_FAMILY);
  if (!font) {
    return;
  }

  try {
    logoSourceFont = parseFont(await fetchFontBuffer(font.sourceUrl, font.family));
    await updateLogoFontForCurrentShape();
  } catch {
    logoTitle.dataset.logoFont = "fallback";
  }
}

async function updateLogoFontForCurrentShape(): Promise<void> {
  const sourceFont = logoSourceFont;
  const pixelShape = getPixelShape();
  if (!sourceFont || renderedLogoPixelShape === pixelShape) {
    return;
  }

  const runId = (logoFontRunId += 1);
  logoTitle.dataset.logoFont = "loading";

  try {
    const generated = await pixelizeFont(sourceFont, {
      ...getDefaultPixelizeOptions(),
      pixelShape,
    });
    const url = URL.createObjectURL(new Blob([generated.arrayBuffer], { type: "font/ttf" }));

    if (runId !== logoFontRunId) {
      revokeUrl(url);
      return;
    }

    const previousUrl = logoFontUrl;
    logoFontUrl = url;
    renderedLogoPixelShape = pixelShape;
    installFontFace(LOGO_FONT_FAMILY, url);
    logoTitle.style.fontFamily = `"${LOGO_FONT_FAMILY}", "Merriweather", Georgia, serif`;
    logoTitle.dataset.logoFont = "ready";
    logoTitle.dataset.logoPixelShape = pixelShape;
    revokeUrl(previousUrl);
  } catch {
    if (runId === logoFontRunId) {
      logoTitle.dataset.logoFont = "fallback";
    }
  }
}

function handleGoogleFontChange(): void {
  const font = DEMO_GOOGLE_FONTS.find((item) => item.family === googleFontSelect.value);
  if (font) {
    const style = getClosestDemoFontStyle(font, selectedDemoStyle);
    void applyDemoFont(font, style);
  } else {
    googleFontCustomSelect.syncValue();
  }
}

function handleGoogleWeightChange(): void {
  const font = DEMO_GOOGLE_FONTS.find((item) => item.family === googleFontSelect.value);
  const style = font?.styles.find((item) => getDemoFontStyleValue(item) === googleWeightSelect.value);
  if (font && style) {
    void applyDemoFont(font, style);
  } else {
    googleWeightCustomSelect.syncValue();
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
    googleWeightSelect.disabled = false;
    if (state.source.googleSource) {
      installSourcePreviewFont(state.source.googleSource);
      if (!state.generated) {
        void generatePixelFont();
      }
      setStatus(state.generated ? UI_COPY.status.generatedReady : UI_COPY.status.demoMode);
    } else {
      void applyDemoFont(state.source.selectedDemoFont, selectedDemoStyle);
      setStatus(UI_COPY.status.demoMode);
    }
  } else {
    uploadInput.value = "";
    googleFontSelect.disabled = true;
    googleWeightSelect.disabled = true;
    if (state.source.uploadedSource) {
      activateUploadedFont();
    } else {
      setStatus(UI_COPY.status.uploadFont);
    }
  }

  syncSourceModeUI();

  if (!sourceEditorField.classList.contains("is-hidden")) {
    focusSourceTextAtEndIfSafe();
  }
}

async function applyDemoFont(font: DemoFontChoice, style = getDefaultDemoFontStyle(font)): Promise<void> {
  state.source.selectedDemoFont = font;
  selectedDemoStyle = style;
  googleFontSelect.value = font.family;
  syncGoogleWeightOptions(font, style);
  googleFontCustomSelect.syncValue();

  sampleText.style.fontFamily = font.cssFamily;
  sampleText.style.fontWeight = `${style.fontWeight}`;
  sampleText.style.fontStyle = style.fontStyle;
  renderDemoPreview();
  void document.fonts.load(`${style.fontStyle} ${style.fontWeight} 44px ${font.cssFamily}`).then(renderDemoPreview);

  if (state.source.mode === "google") {
    await loadDemoFontFile(font, style);
  }
}

async function loadDemoFontFile(font: DemoFontChoice, style: DemoFontStyleChoice): Promise<void> {
  const loadRun = startSourceLoadRun();
  window.clearTimeout(autoGenerateTimer);
  cancelGenerationRun();
  clearGoogleSource();
  document.getElementById("font-face-SourcePreviewFont")?.remove();
  setStatus(UI_COPY.dynamicStatus.loadingFont(`${font.family} ${style.label}`));

  try {
    const buffer = await fetchFontBuffer(style.sourceUrl, `${font.family} ${style.label}`);
    const sourceFont = parseFont(buffer);
    const sourceUrl = URL.createObjectURL(new Blob([buffer], { type: "font/ttf" }));

    if (
      !loadRun.isCurrent() ||
      state.source.mode !== "google" ||
      state.source.selectedDemoFont !== font ||
      selectedDemoStyle !== style
    ) {
      revokeUrl(sourceUrl);
      return;
    }

    state.source.googleSource = {
      kind: "google",
      demoFont: font,
      demoStyle: style,
      sourceFont,
      sourceUrl,
    };
    installSourcePreviewFont(state.source.googleSource);
    syncSourceModeUI();
    focusSourceTextAtEndIfSafe();
    await generatePixelFont();
  } catch (error) {
    if (
      loadRun.isCurrent() &&
      state.source.mode === "google" &&
      state.source.selectedDemoFont === font &&
      selectedDemoStyle === style
    ) {
      renderError(error, UI_COPY.errors.couldNotLoadFont(`${font.family} ${style.label}`));
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
    focusSourceTextAtEndIfSafe();
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
    const pixelizeOptions = getPixelizeOptions();
    const generated = await pixelizeFont(
      generationSource.sourceFont,
      pixelizeOptions,
      (done, total) => {
        if (run.isCurrent()) {
          setStatus(UI_COPY.dynamicStatus.generatingProgress(done, total));
        }
      },
      getPixelizeMetadata(generationSource, pixelizeOptions),
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

    const generatedFontWeight = generationSource.kind === "google" ? generationSource.demoStyle.fontWeight : 400;
    const generatedFontStyle = generationSource.kind === "google" ? generationSource.demoStyle.fontStyle : "normal";
    installFontFace("PixelizedPreviewFont", url, { fontWeight: generatedFontWeight, fontStyle: generatedFontStyle });
    if (previousGeneratedUrl && previousGeneratedUrl !== url) {
      revokeUrl(previousGeneratedUrl);
    }
    if (previousGeneratedPackageUrl && previousGeneratedPackageUrl !== packageUrl) {
      revokeUrl(previousGeneratedPackageUrl);
    }
    afterPreview.style.fontFamily = '"PixelizedPreviewFont", ui-monospace, monospace';
    afterPreview.style.fontWeight = `${generatedFontWeight}`;
    afterPreview.style.fontStyle = generatedFontStyle;
    afterPreview.classList.add("is-hidden");
    afterPreview.classList.remove("empty-preview");
    demoPreviewFrame.classList.remove("is-hidden");
    demoPreviewCanvas.classList.remove("is-hidden");
    downloadLink.href = packageUrl;
    downloadLink.download = makePackageFileName(generated.familyName, generated.styleName);
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
  googleFontSelect.disabled = !isGoogleMode;
  googleWeightSelect.disabled = !isGoogleMode;
  googleFontField.classList.toggle("is-hidden", !isGoogleMode);
  googleWeightField.classList.toggle("is-hidden", !isGoogleMode);
  googleFontCustomSelect.syncDisabled();
  googleWeightCustomSelect.syncDisabled();
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
  pixelEffectSelect.value = "square";
  pixelEffectCustomSelect.syncValue();

  sourcePreviewFontSize = null;
  outputPreviewFontSize = null;
  applySourcePreviewSize();

  syncControlLabels();
  syncPreviewSizes();

  if (getGenerationSource()) {
    void generatePixelFont();
  } else {
    renderDemoPreview();
  }
}

function getComputedSourceFontSize(): number {
  return Number.parseFloat(getComputedStyle(sampleText).fontSize) || FALLBACK_PREVIEW_FONT_SIZE;
}

function getEffectiveSourceFontSize(): number {
  return sourcePreviewFontSize ?? getComputedSourceFontSize();
}

function getEffectiveOutputFontSize(): number {
  return outputPreviewFontSize ?? getEffectiveSourceFontSize();
}

function clampPreviewFontSize(value: number): number {
  return Math.min(MAX_PREVIEW_FONT_SIZE, Math.max(MIN_PREVIEW_FONT_SIZE, Math.round(value)));
}

function applySourcePreviewSize(): void {
  sampleText.style.fontSize = sourcePreviewFontSize === null ? "" : `${sourcePreviewFontSize}px`;
}

function adjustSourcePreviewSize(delta: number): void {
  const base = sourcePreviewFontSize ?? Math.round(getComputedSourceFontSize());
  sourcePreviewFontSize = clampPreviewFontSize(base + delta);
  applySourcePreviewSize();
  syncPreviewSizes();
}

function adjustOutputPreviewSize(delta: number): void {
  const base = outputPreviewFontSize ?? Math.round(getEffectiveOutputFontSize());
  outputPreviewFontSize = clampPreviewFontSize(base + delta);
  syncPreviewSizes();
}

function syncPreviewSizes(): void {
  const sourceSize = Math.round(getEffectiveSourceFontSize());
  const outputSize = Math.round(getEffectiveOutputFontSize());
  sourceSizeReadout.textContent = UI_COPY.controls.previewSizeReadout(sourceSize);
  outputSizeReadout.textContent = UI_COPY.controls.previewSizeReadout(outputSize);
  sourceSizeDecrease.disabled = sourceSize <= MIN_PREVIEW_FONT_SIZE;
  sourceSizeIncrease.disabled = sourceSize >= MAX_PREVIEW_FONT_SIZE;
  outputSizeDecrease.disabled = outputSize <= MIN_PREVIEW_FONT_SIZE;
  outputSizeIncrease.disabled = outputSize >= MAX_PREVIEW_FONT_SIZE;
  syncResetButton();
  renderDemoPreview();
}

function syncControlLabels(): void {
  setText(controlLabels[0], getPixelsPerEmLabel(), "pixels-per-em control label");
  pixelsPerEmValue.textContent = pixelsPerEm.value;
  thresholdValue.textContent = `${threshold.value}${UI_COPY.controls.thresholdUnit}`;
  expandValue.textContent = expand.value;
  shiftXValue.textContent = `${formatShiftValue(shiftX.value)} ${UI_COPY.controls.shiftUnit}`;
  shiftYValue.textContent = `${formatShiftValue(shiftY.value)} ${UI_COPY.controls.shiftUnit}`;
  syncResetButton();
  void updateLogoFontForCurrentShape();

  if (!state.generated) {
    renderDemoPreview();
  }
}

function syncResetButton(): void {
  const rangesAtDefault = [pixelsPerEm, threshold, expand, shiftX, shiftY].every(
    (input) => input.value === input.defaultValue,
  );
  const shapeAtDefault = getPixelShape() === "square";
  const sizesAtDefault = sourcePreviewFontSize === null && outputPreviewFontSize === null;
  resetButton.disabled = rangesAtDefault && shapeAtDefault && sizesAtDefault;
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
    pixelShape: getPixelShape(),
    shiftX: Number(shiftX.value),
    shiftY: Number(shiftY.value),
  };
}

function getDefaultPixelizeOptions(): PixelizeOptions {
  return {
    pixelsPerEm: Number(pixelsPerEm.defaultValue),
    threshold: Number(threshold.defaultValue) / 100,
    expand: Number(expand.defaultValue),
    pixelShape: "square",
    shiftX: Number(shiftX.defaultValue),
    shiftY: Number(shiftY.defaultValue),
  };
}

function getPixelShape(): PixelShape {
  const value = pixelEffectSelect.value;
  return isPixelShape(value) ? value : "square";
}

function getPixelsPerEmLabel(): string {
  const pixelShape = getPixelShape();

  if (pixelShape === "round") {
    return UI_COPY.controls.dotsPerEm;
  }

  if (pixelShape === "vertical-lines" || pixelShape === "horizontal-lines") {
    return UI_COPY.controls.linesPerEm;
  }

  return UI_COPY.controls.pixelsPerEm;
}

function isPixelShape(value: string): value is PixelShape {
  return value === "square" || value === "round" || value === "vertical-lines" || value === "horizontal-lines";
}

function setPixelEffectOptionCopy(value: PixelShape, label: string): void {
  const option = pixelEffectSelect.querySelector<HTMLOptionElement>(`option[value="${value}"]`);
  setText(option ?? undefined, label, `${value} pixel effect option`);
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
  afterPreview.style.fontWeight = "";
  afterPreview.style.fontStyle = "";
  afterPreview.classList.add("is-hidden");
  afterPreview.classList.remove("empty-preview");
  afterPreview.textContent = sampleText.value || " ";
  demoPreviewFrame.classList.remove("is-hidden");
  demoPreviewCanvas.classList.remove("is-hidden");
  outputSizeBar.classList.remove("is-hidden");
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
  focusSourceTextAtEndIfSafe();
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

  const frameRect = demoPreviewScroll.getBoundingClientRect();
  const width = Math.max(1, Math.round(demoPreviewScroll.clientWidth || frameRect.width || 720));
  const visibleHeight = Math.max(1, Math.round(demoPreviewScroll.clientHeight || frameRect.height || 280));
  const source = document.createElement("canvas");
  source.width = width;
  source.height = 1;
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) {
    return;
  }

  const options = getPixelizeOptions();
  const previewStyles = getComputedStyle(sampleText);
  const sourceFontSize = Number.parseFloat(previewStyles.fontSize) || FALLBACK_PREVIEW_FONT_SIZE;
  const sourceLineHeight = Number.parseFloat(previewStyles.lineHeight) || sourceFontSize * 1.12;
  // The pixel output preview is sized independently of the source textarea.
  const previewFontSize = getEffectiveOutputFontSize();
  const previewLineHeight = previewFontSize * (sourceLineHeight / sourceFontSize);
  const previewPaddingLeft = Number.parseFloat(previewStyles.paddingLeft) || 16;
  const previewPaddingRight = Number.parseFloat(previewStyles.paddingRight) || previewPaddingLeft;
  const previewPaddingTop = Number.parseFloat(previewStyles.paddingTop) || previewPaddingLeft;
  // Mirror the top padding so the source textarea's reserved bottom space
  // (for the floating size control) never inflates the output canvas height.
  const previewPaddingBottom = previewPaddingTop;
  const previewFontFamily =
    previewStyles.fontFamily || '"JetBrains Mono", "SFMono-Regular", ui-monospace, monospace';
  const previewFontWeight = previewStyles.fontWeight || "400";
  const previewFontStyle = previewStyles.fontStyle || "normal";
  const previewFont = `${previewFontStyle} ${previewFontWeight} ${previewFontSize}px ${previewFontFamily}`;
  const cellSize = Math.max(1, Math.round(previewFontSize / options.pixelsPerEm));
  const shiftXPixels = options.shiftX ? options.shiftX * cellSize : 0;
  const shiftYPixels = options.shiftY ? options.shiftY * cellSize : 0;
  sourceContext.font = previewFont;
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
  demoPreviewCanvas.dataset.renderFontWeight = previewFontWeight;
  demoPreviewCanvas.dataset.renderFontStyle = previewFontStyle;
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
  sourceContext.font = previewFont;
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
        drawPreviewPixelCell(context, options.pixelShape ?? "square", col * cellSize, row * cellSize, cellSize);
      }
    }
  }
}

function drawPreviewPixelCell(
  context: CanvasRenderingContext2D,
  pixelShape: PixelShape,
  x: number,
  y: number,
  size: number,
): void {
  if (pixelShape === "round") {
    const radius = size / 2;
    context.beginPath();
    context.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
    context.fill();
    return;
  }

  if (pixelShape === "vertical-lines") {
    const strokeSize = Math.max(1, Math.round(size * 0.44));
    const offset = Math.round((size - strokeSize) / 2);
    context.fillRect(x + offset, y, strokeSize, size);
    return;
  }

  if (pixelShape === "horizontal-lines") {
    const strokeSize = Math.max(1, Math.round(size * 0.44));
    const offset = Math.round((size - strokeSize) / 2);
    context.fillRect(x, y + offset, size, strokeSize);
    return;
  }

  context.fillRect(x, y, size, size);
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

function installFontFace(
  fontFamily: string,
  url: string,
  options: { fontWeight?: number | string; fontStyle?: DemoFontSlant } = {},
): void {
  const styleId = `font-face-${fontFamily}`;
  document.getElementById(styleId)?.remove();
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @font-face {
      font-family: "${fontFamily}";
      src: url("${url}") format("truetype");
      font-weight: ${options.fontWeight ?? "400"};
      font-style: ${options.fontStyle ?? "normal"};
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
  outputSizeBar.classList.add("is-hidden");
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

function makeGeneratedFontNames(source: ActiveSource, options: PixelizeOptions): PixelizeFontNames {
  const sourceFamily = getSourceFamilyName(source);
  const sourceCode = makeSourceCode(sourceFamily);
  const recipe = makeFontRecipe(options);
  const hash = makeFontNameHash([
    "v1",
    source.kind,
    sourceFamily,
    sourceCode,
    recipe,
    options.pixelShape ?? "square",
    formatHashNumber(options.shiftX ?? 0),
    formatHashNumber(options.shiftY ?? 0),
  ]);
  const familyName = `${GENERATED_FONT_BRAND} ${sourceCode} ${recipe} ${hash}`;
  const styleName = getSourceStyleName(source);
  const fullName = `${familyName} ${styleName}`.trim();

  return {
    familyName,
    styleName,
    fullName,
    postScriptName: makePostScriptName(fullName),
  };
}

function getSourceFamilyName(source: ActiveSource): string {
  return source.kind === "google" ? source.demoFont.family : getFontFamilyName(source.sourceFont);
}

function getSourceStyleName(source: ActiveSource): string {
  return source.kind === "google" ? source.demoStyle.label : getFontStyleName(source.sourceFont);
}

function makeFontRecipe(options: PixelizeOptions): string {
  return `${Math.round(options.pixelsPerEm)}-${Math.round(options.threshold * 100)}-${Math.round(options.expand)}`;
}

function makeSourceCode(sourceFamily: string): string {
  const tokens = sourceFamily.match(/[a-zA-Z0-9]+/g) ?? [];
  const compactTokens = tokens
    .filter((token) => !SOURCE_CODE_OMITTED_TOKENS.has(token.toLowerCase()))
    .map(compactSourceToken)
    .filter(Boolean);

  return compactTokens.join("") || "Font";
}

function compactSourceToken(token: string): string {
  const normalizedToken = toTitleToken(token);

  if (SOURCE_CODE_PRESERVED_TOKENS.has(token.toLowerCase())) {
    return normalizedToken;
  }

  return normalizedToken.replace(/[aeiou]/gi, "") || normalizedToken.slice(0, 1);
}

function toTitleToken(token: string): string {
  return `${token.slice(0, 1).toUpperCase()}${token.slice(1).toLowerCase()}`;
}

function makeFontNameHash(parts: string[]): string {
  let hash = 2166136261;
  const input = parts.join("|");

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-4);
}

function formatHashNumber(value: number): string {
  return value.toFixed(2);
}

function makePostScriptName(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "PixelPlease-Generated-Regular";
}

function getSourceNoticeInfo(source: ActiveSource): NoticeSourceInfo {
  if (source.kind === "google") {
    const licensePackagePath = getSourceLicensePackagePath(source.demoFont);
    return {
      sourceName: `${source.demoFont.family} ${source.demoStyle.label}`,
      sourceFileName: source.demoStyle.sourceFileName,
      sourceLicense: source.demoFont.license,
      sourceLicenseFileName: source.demoFont.licenseFileName,
      sourceLicensePackagePath: licensePackagePath,
      sourceUrl: source.demoStyle.sourceReferenceUrl,
    };
  }

  return {
    sourceName: getFontLabel(source.sourceFont),
    sourceFileName: source.file.name,
    sourceLicense: "User-provided; rights not verified by pixelplease.",
  };
}

function getPixelizeMetadata(source: ActiveSource, options: PixelizeOptions): { sourceLicenseUrl?: string; fontNames: PixelizeFontNames } {
  return {
    ...(source.kind === "google" ? { sourceLicenseUrl: source.demoFont.licenseUrl } : {}),
    fontNames: makeGeneratedFontNames(source, options),
  };
}

async function buildDownloadPackageFiles(
  generated: PixelizeResult,
  source: ActiveSource,
): Promise<DownloadPackageFile[]> {
  const sourceNoticeInfo = getSourceNoticeInfo(source);
  const files: DownloadPackageFile[] = [
    { name: makeTtfFileName(generated.familyName, generated.styleName), data: generated.arrayBuffer },
    { name: "NOTICE.txt", data: buildNoticeText(generated.familyName, sourceNoticeInfo, generated.styleName) },
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
  const fontWeight = source.kind === "google" ? source.demoStyle.fontWeight : 400;
  const fontStyle = source.kind === "google" ? source.demoStyle.fontStyle : "normal";
  installFontFace("SourcePreviewFont", source.sourceUrl, { fontWeight, fontStyle });
  sampleText.style.fontFamily =
    source.kind === "google"
      ? `"SourcePreviewFont", ${source.demoFont.cssFamily}`
      : '"SourcePreviewFont", system-ui, sans-serif';
  sampleText.style.fontWeight = `${fontWeight}`;
  sampleText.style.fontStyle = fontStyle;
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
  const path = new URL(url, "https://pixelplease.local").pathname.split("/").pop() || "source-font.ttf";
  return decodeURIComponent(path);
}

function getDefaultDemoFont(): DemoFontChoice {
  const font = DEMO_GOOGLE_FONTS.find((item) => item.family === DEFAULT_DEMO_FONT_FAMILY);
  if (!font) {
    throw new Error(`Missing default demo font: ${DEFAULT_DEMO_FONT_FAMILY}`);
  }
  return font;
}

function getDefaultDemoFontStyle(font: DemoFontChoice): DemoFontStyleChoice {
  return font.styles.find((style) => style.fontWeight === 400 && style.fontStyle === "normal") ?? font.styles[0];
}

function getClosestDemoFontStyle(font: DemoFontChoice, referenceStyle: DemoFontStyleChoice): DemoFontStyleChoice {
  const matchingSlantStyles = font.styles.filter((style) => style.fontStyle === referenceStyle.fontStyle);
  const styles = matchingSlantStyles.length > 0 ? matchingSlantStyles : font.styles;

  return styles.reduce((best, style) => {
    const bestDistance = Math.abs(best.fontWeight - referenceStyle.fontWeight);
    const currentDistance = Math.abs(style.fontWeight - referenceStyle.fontWeight);
    return currentDistance < bestDistance ? style : best;
  }, styles.find((style) => style.fontWeight === 400) ?? styles[0] ?? getDefaultDemoFontStyle(font));
}

function syncGoogleWeightOptions(font: DemoFontChoice, selectedStyle: DemoFontStyleChoice): void {
  googleWeightSelect.replaceChildren(
    ...getOrderedDemoFontStyles(font).map((style) => {
      const option = document.createElement("option");
      option.value = getDemoFontStyleValue(style);
      option.textContent = style.label;
      return option;
    }),
  );
  googleWeightSelect.value = getDemoFontStyleValue(selectedStyle);
  googleWeightCustomSelect.syncOptions();
}

function getDemoFontStyleValue(style: DemoFontStyleChoice): string {
  return style.fontStyle === "italic" ? `${style.fontWeight}-italic` : `${style.fontWeight}`;
}

function getOrderedDemoFontStyles(font: DemoFontChoice): DemoFontStyleChoice[] {
  return [...font.styles].sort((first, second) => {
    const weightDistance = first.fontWeight - second.fontWeight;
    if (weightDistance !== 0) {
      return weightDistance;
    }
    if (first.fontStyle === second.fontStyle) {
      return 0;
    }
    return first.fontStyle === "normal" ? -1 : 1;
  });
}

function focusSourceTextAtEnd(): void {
  const end = sampleText.value.length;
  sampleText.focus({ preventScroll: true });
  sampleText.setSelectionRange(end, end);
}

function focusSourceTextAtEndIfSafe(): void {
  const shouldAvoidAutoFocus =
    window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0 || window.innerWidth < 760;

  if (shouldAvoidAutoFocus) {
    if (document.activeElement === sampleText) {
      sampleText.blur();
    }
    return;
  }

  focusSourceTextAtEnd();
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

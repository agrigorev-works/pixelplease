import opentype from "opentype.js";

export type PixelizeOptions = {
  pixelsPerEm: number;
  threshold: number;
  expand: number;
};

export type FontMetrics = {
  unitsPerEm: number;
  ascender: number;
  descender: number;
};

export type CellMask = {
  cols: number;
  rows: number;
  cells: Uint8Array;
};

export type CoverageItem = {
  codePoint: number;
  char: string;
  supported: boolean;
  glyphIndex: number;
};

export type PixelizeResult = {
  font: opentype.Font;
  arrayBuffer: ArrayBuffer;
  glyphCount: number;
  familyName: string;
};

const BASIC_LATIN_START = 32;
const BASIC_LATIN_END = 126;

export function parseFont(buffer: ArrayBuffer): opentype.Font {
  return opentype.parse(buffer);
}

export function getFontLabel(font: opentype.Font): string {
  const family = readName(font, "preferredFamily") || readName(font, "fontFamily") || "Uploaded Font";
  const style = readName(font, "preferredSubfamily") || readName(font, "fontSubfamily") || "Regular";
  return `${family} ${style}`.trim();
}

export function makeDerivativeFamilyName(font: opentype.Font): string {
  const base = readName(font, "preferredFamily") || readName(font, "fontFamily") || "Uploaded";
  return `${sanitizeName(base)} Pixel Test`;
}

export function getBasicLatinCoverage(font: opentype.Font): CoverageItem[] {
  const items: CoverageItem[] = [];

  for (let codePoint = BASIC_LATIN_START; codePoint <= BASIC_LATIN_END; codePoint += 1) {
    const char = String.fromCharCode(codePoint);
    const glyphIndex = font.charToGlyphIndex(char);
    items.push({
      codePoint,
      char,
      supported: codePoint === 32 || glyphIndex > 0,
      glyphIndex,
    });
  }

  return items;
}

export function summarizeCoverage(coverage: CoverageItem[]): string {
  const supported = coverage.filter((item) => item.supported).length;
  return `${supported}/${coverage.length} Basic Latin`;
}

export async function pixelizeFont(
  sourceFont: opentype.Font,
  options: PixelizeOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<PixelizeResult> {
  await nextFrame();

  const metrics = getMetrics(sourceFont);
  const familyName = makeDerivativeFamilyName(sourceFont);
  const glyphs: opentype.Glyph[] = [createNotDefGlyph(metrics, options)];
  const coverage = getBasicLatinCoverage(sourceFont).filter((item) => item.supported);

  for (let index = 0; index < coverage.length; index += 1) {
    const item = coverage[index];
    const glyph = sourceFont.charToGlyph(item.char);
    glyphs.push(pixelizeGlyph(glyph, item.codePoint, metrics, options));
    onProgress?.(index + 1, coverage.length);

    if (index % 12 === 0) {
      await nextFrame();
    }
  }

  const pixelFont = new opentype.Font({
    familyName,
    styleName: "Regular",
    unitsPerEm: metrics.unitsPerEm,
    ascender: metrics.ascender,
    descender: metrics.descender,
    glyphs,
  });

  return {
    font: pixelFont,
    arrayBuffer: pixelFont.toArrayBuffer(),
    glyphCount: glyphs.length,
    familyName,
  };
}

export function pixelizeGlyph(
  sourceGlyph: opentype.Glyph,
  codePoint: number,
  metrics: FontMetrics,
  options: PixelizeOptions,
): opentype.Glyph {
  const advanceWidth = Math.max(0, sourceGlyph.advanceWidth || metrics.unitsPerEm * 0.5);

  if (codePoint === 32 || sourceGlyph.index === 0) {
    return new opentype.Glyph({
      name: glyphName(codePoint),
      unicode: codePoint,
      advanceWidth: snapAdvance(advanceWidth, metrics, options),
      path: new opentype.Path(),
    });
  }

  const mask = rasterizeGlyphToCells(sourceGlyph, metrics, options);
  const expandedMask = options.expand > 0 ? dilateMask(mask, options.expand) : mask;
  const path = cellsToPath(expandedMask, metrics, options);

  return new opentype.Glyph({
    name: glyphName(codePoint),
    unicode: codePoint,
    advanceWidth: snapAdvance(advanceWidth, metrics, options),
    path,
  });
}

export function cellsToPath(mask: CellMask, metrics: FontMetrics, options: PixelizeOptions): opentype.Path {
  const path = new opentype.Path();
  const cellSize = getCellSize(metrics, options);

  for (let row = 0; row < mask.rows; row += 1) {
    let col = 0;

    while (col < mask.cols) {
      while (col < mask.cols && !isFilled(mask, col, row)) {
        col += 1;
      }

      if (col >= mask.cols) {
        break;
      }

      const start = col;
      while (col < mask.cols && isFilled(mask, col, row)) {
        col += 1;
      }

      const end = col;
      const x0 = start * cellSize;
      const x1 = end * cellSize;
      const yTop = metrics.ascender - row * cellSize;
      const yBottom = yTop - cellSize;
      addRect(path, x0, yBottom, x1, yTop);
    }
  }

  return path;
}

export function dilateMask(mask: CellMask, radius: number): CellMask {
  const output = new Uint8Array(mask.cells.length);

  for (let row = 0; row < mask.rows; row += 1) {
    for (let col = 0; col < mask.cols; col += 1) {
      if (!isFilled(mask, col, row)) {
        continue;
      }

      for (let y = row - radius; y <= row + radius; y += 1) {
        for (let x = col - radius; x <= col + radius; x += 1) {
          if (x >= 0 && x < mask.cols && y >= 0 && y < mask.rows) {
            output[y * mask.cols + x] = 1;
          }
        }
      }
    }
  }

  return { ...mask, cells: output };
}

export function getMetrics(font: opentype.Font): FontMetrics {
  const unitsPerEm = font.unitsPerEm || 1000;
  return {
    unitsPerEm,
    ascender: font.ascender || Math.round(unitsPerEm * 0.8),
    descender: font.descender || -Math.round(unitsPerEm * 0.2),
  };
}

export function getCellSize(metrics: FontMetrics, options: PixelizeOptions): number {
  return metrics.unitsPerEm / clamp(options.pixelsPerEm, 8, 64);
}

export function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim() || "Uploaded";
}

function rasterizeGlyphToCells(
  sourceGlyph: opentype.Glyph,
  metrics: FontMetrics,
  options: PixelizeOptions,
): CellMask {
  const cellSize = getCellSize(metrics, options);
  const advanceWidth = Math.max(cellSize, sourceGlyph.advanceWidth || metrics.unitsPerEm * 0.5);
  const cols = Math.max(1, Math.ceil(advanceWidth / cellSize));
  const rows = Math.max(1, Math.ceil((metrics.ascender - metrics.descender) / cellSize));
  const samplesPerCell = 5;
  const scale = samplesPerCell / cellSize;
  const canvas = document.createElement("canvas");
  canvas.width = cols * samplesPerCell;
  canvas.height = rows * samplesPerCell;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Could not create canvas context for glyph rasterization.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#000";
  sourceGlyph.draw(context, 0, metrics.ascender * scale, metrics.unitsPerEm * scale);

  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const cells = new Uint8Array(cols * rows);
  const threshold = clamp(options.threshold, 0.05, 0.95);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let alphaTotal = 0;

      for (let y = 0; y < samplesPerCell; y += 1) {
        for (let x = 0; x < samplesPerCell; x += 1) {
          const pixelX = col * samplesPerCell + x;
          const pixelY = row * samplesPerCell + y;
          const alphaIndex = (pixelY * canvas.width + pixelX) * 4 + 3;
          alphaTotal += data[alphaIndex];
        }
      }

      const fillRatio = alphaTotal / (255 * samplesPerCell * samplesPerCell);
      cells[row * cols + col] = fillRatio >= threshold ? 1 : 0;
    }
  }

  return { cols, rows, cells };
}

function createNotDefGlyph(metrics: FontMetrics, options: PixelizeOptions): opentype.Glyph {
  const cellSize = getCellSize(metrics, options);
  const path = new opentype.Path();
  const width = Math.round(metrics.unitsPerEm * 0.5 / cellSize) * cellSize;
  const top = Math.round(metrics.ascender / cellSize) * cellSize;
  const bottom = Math.round(metrics.descender / cellSize) * cellSize;

  addRect(path, 0, bottom, width, top);
  addRect(path, cellSize, bottom + cellSize, width - cellSize, top - cellSize, true);

  return new opentype.Glyph({
    name: ".notdef",
    advanceWidth: width + cellSize,
    path,
  });
}

function addRect(path: opentype.Path, x0: number, y0: number, x1: number, y1: number, reverse = false): void {
  if (reverse) {
    path.moveTo(x0, y0);
    path.lineTo(x0, y1);
    path.lineTo(x1, y1);
    path.lineTo(x1, y0);
    path.close();
    return;
  }

  path.moveTo(x0, y0);
  path.lineTo(x1, y0);
  path.lineTo(x1, y1);
  path.lineTo(x0, y1);
  path.close();
}

function isFilled(mask: CellMask, col: number, row: number): boolean {
  return mask.cells[row * mask.cols + col] === 1;
}

function snapAdvance(advanceWidth: number, metrics: FontMetrics, options: PixelizeOptions): number {
  const cellSize = getCellSize(metrics, options);
  return Math.max(cellSize, Math.ceil(advanceWidth / cellSize) * cellSize);
}

function glyphName(codePoint: number): string {
  return `u${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}

function readName(font: opentype.Font, key: string): string | undefined {
  const names = font.names as unknown as Record<string, Record<string, string> | undefined>;
  return names[key]?.en || Object.values(names[key] || {})[0];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

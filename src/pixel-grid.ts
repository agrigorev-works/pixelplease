export type CellMask = {
  cols: number;
  rows: number;
  cells: Uint8Array;
  /** Continuous ink coverage (0–1), retained for coverage-sensitive effects. */
  coverage?: Float32Array;
};

export type RasterSampleMode = "alpha" | "darkness";

export function createCellMaskFromImageData({
  data,
  width,
  height,
  cellSize,
  threshold,
  mode,
}: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  cellSize: number;
  threshold: number;
  mode: RasterSampleMode;
}): CellMask {
  const safeCellSize = Math.max(1, Math.round(cellSize));
  const cols = Math.max(1, Math.ceil(width / safeCellSize));
  const rows = Math.max(1, Math.ceil(height / safeCellSize));
  const cells = new Uint8Array(cols * rows);
  const coverage = new Float32Array(cols * rows);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let total = 0;
      let count = 0;

      for (let y = row * safeCellSize; y < Math.min(height, (row + 1) * safeCellSize); y += 1) {
        for (let x = col * safeCellSize; x < Math.min(width, (col + 1) * safeCellSize); x += 1) {
          total += getInkValue(data, (y * width + x) * 4, mode);
          count += 1;
        }
      }

      const ink = total / Math.max(1, count);
      coverage[row * cols + col] = ink;
      cells[row * cols + col] = ink >= threshold ? 1 : 0;
    }
  }

  return { cols, rows, cells, coverage };
}

export function expandCellMask(mask: CellMask, radius: number): CellMask {
  if (radius <= 0) {
    return mask;
  }

  const output = new Uint8Array(mask.cells.length);
  const coverage = mask.coverage ? new Float32Array(mask.cells.length) : undefined;

  for (let row = 0; row < mask.rows; row += 1) {
    for (let col = 0; col < mask.cols; col += 1) {
      if (!isCellFilled(mask, col, row)) {
        continue;
      }

      for (let y = row - radius; y <= row + radius; y += 1) {
        for (let x = col - radius; x <= col + radius; x += 1) {
          if (x >= 0 && x < mask.cols && y >= 0 && y < mask.rows) {
            const target = y * mask.cols + x;
            output[target] = 1;
            if (coverage) {
              coverage[target] = Math.max(coverage[target], mask.coverage![row * mask.cols + col]);
            }
          }
        }
      }
    }
  }

  return { ...mask, cells: output, ...(coverage ? { coverage } : {}) };
}

export function isCellFilled(mask: CellMask, col: number, row: number): boolean {
  return mask.cells[row * mask.cols + col] === 1;
}

function getInkValue(data: Uint8ClampedArray, index: number, mode: RasterSampleMode): number {
  const alpha = data[index + 3] / 255;

  if (mode === "alpha") {
    return alpha;
  }

  const luma = (data[index] + data[index + 1] + data[index + 2]) / (255 * 3);
  return (1 - luma) * alpha;
}

/** Dot area follows ink coverage; the 10% gap keeps solid interiors visibly screened. */
export function getHalftoneRadius(mask: CellMask, col: number, row: number, cellSize: number): number {
  if (!isCellFilled(mask, col, row)) return 0;
  const ink = mask.coverage?.[row * mask.cols + col] ?? 1;
  return Number.isFinite(ink) ? cellSize * 0.45 * Math.sqrt(Math.max(0, Math.min(1, ink))) : 0;
}

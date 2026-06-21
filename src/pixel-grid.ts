export type CellMask = {
  cols: number;
  rows: number;
  cells: Uint8Array;
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

      cells[row * cols + col] = total / Math.max(1, count) >= threshold ? 1 : 0;
    }
  }

  return { cols, rows, cells };
}

export function expandCellMask(mask: CellMask, radius: number): CellMask {
  if (radius <= 0) {
    return mask;
  }

  const output = new Uint8Array(mask.cells.length);

  for (let row = 0; row < mask.rows; row += 1) {
    for (let col = 0; col < mask.cols; col += 1) {
      if (!isCellFilled(mask, col, row)) {
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

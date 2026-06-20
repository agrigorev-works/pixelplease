import { describe, expect, it } from "vitest";
import opentype from "opentype.js";
import {
  cellsToPath,
  dilateMask,
  getBasicLatinCoverage,
  sanitizeName,
  type CellMask,
  type FontMetrics,
} from "../src/font-pixelizer";

const metrics: FontMetrics = {
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
};

describe("font pixelizer core", () => {
  it("groups adjacent cells into rectangular path runs", () => {
    const mask: CellMask = {
      cols: 4,
      rows: 2,
      cells: Uint8Array.from([
        1, 1, 0, 1,
        0, 1, 1, 0,
      ]),
    };

    const path = cellsToPath(mask, metrics, { pixelsPerEm: 10, threshold: 0.5, expand: 0 });
    const moveCommands = path.commands.filter((command) => command.type === "M");
    const closeCommands = path.commands.filter((command) => command.type === "Z");

    expect(moveCommands).toHaveLength(3);
    expect(closeCommands).toHaveLength(3);
  });

  it("expands filled cells by the requested radius", () => {
    const mask: CellMask = {
      cols: 3,
      rows: 3,
      cells: Uint8Array.from([
        0, 0, 0,
        0, 1, 0,
        0, 0, 0,
      ]),
    };

    const expanded = dilateMask(mask, 1);

    expect(Array.from(expanded.cells)).toEqual([
      1, 1, 1,
      1, 1, 1,
      1, 1, 1,
    ]);
  });

  it("reports Basic Latin coverage from an opentype font", () => {
    const glyphs = [
      new opentype.Glyph({ name: ".notdef", advanceWidth: 500, path: new opentype.Path() }),
      new opentype.Glyph({ name: "A", unicode: 65, advanceWidth: 700, path: rectanglePath() }),
    ];
    const font = new opentype.Font({
      familyName: "Fixture",
      styleName: "Regular",
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      glyphs,
    });

    const coverage = getBasicLatinCoverage(font);

    expect(coverage.find((item) => item.char === "A")?.supported).toBe(true);
    expect(coverage.find((item) => item.char === "B")?.supported).toBe(false);
    expect(coverage.find((item) => item.char === " ")?.supported).toBe(true);
  });

  it("sanitizes derivative family names", () => {
    expect(sanitizeName("Demo/Font::Regular")).toBe("Demo Font Regular");
    expect(sanitizeName("")).toBe("Uploaded");
  });
});

function rectanglePath(): opentype.Path {
  const path = new opentype.Path();
  path.moveTo(80, 0);
  path.lineTo(620, 0);
  path.lineTo(620, 700);
  path.lineTo(80, 700);
  path.close();
  return path;
}

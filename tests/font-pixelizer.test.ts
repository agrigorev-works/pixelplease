import { describe, expect, it } from "vitest";
import opentype from "opentype.js";
import {
  cellsToPath,
  dilateMask,
  getBasicLatinCoverage,
  getCellSize,
  getGridPixelsPerEm,
  makeDerivativeFamilyName,
  sanitizeName,
  type CellMask,
  type FontMetrics,
} from "../src/font-pixelizer";
import { buildNoticeText, createStoredZip } from "../src/download-package";

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

  it("uses a product-owned derivative family name without source font tokens", () => {
    expect(makeDerivativeFamilyName()).toBe("Pixelplease Test");
    expect(makeDerivativeFamilyName()).not.toContain("Lato");
    expect(makeDerivativeFamilyName()).not.toContain("Fixture");
  });

  it("snaps the pixel grid to a clean units-per-em divisor", () => {
    expect(getGridPixelsPerEm(metrics, { pixelsPerEm: 18, threshold: 0.5, expand: 0 })).toBe(20);
    expect(getCellSize(metrics, { pixelsPerEm: 18, threshold: 0.5, expand: 0 })).toBe(50);

    const powerOfTwoMetrics = { ...metrics, unitsPerEm: 2048 };
    expect(getGridPixelsPerEm(powerOfTwoMetrics, { pixelsPerEm: 20, threshold: 0.5, expand: 0 })).toBe(16);
    expect(getCellSize(powerOfTwoMetrics, { pixelsPerEm: 20, threshold: 0.5, expand: 0 })).toBe(128);
  });

  it("packages generated fonts with a notice file", () => {
    const notice = buildNoticeText("Pixelplease Test", {
      sourceName: "Fixture Sans",
      sourceFileName: "fixture-source.ttf",
      sourceLicense: "OFL",
      sourceUrl: "https://example.com/fixture-source.ttf",
    });
    const zip = createStoredZip([
      { name: "Pixelplease-Test.ttf", data: Uint8Array.from([1, 2, 3]) },
      { name: "NOTICE.txt", data: notice },
    ]);
    const entries = readStoredZip(zip);

    expect(Object.keys(entries).sort()).toEqual(["NOTICE.txt", "Pixelplease-Test.ttf"]);
    expect(entries["Pixelplease-Test.ttf"]).toEqual(Uint8Array.from([1, 2, 3]));
    expect(new TextDecoder().decode(entries["NOTICE.txt"])).toContain("Fixture Sans");
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
    const name = new TextDecoder().decode(data.slice(nameStart, nameStart + nameLength));
    entries[name] = data.slice(dataStart, dataStart + compressedSize);
    offset = dataStart + compressedSize;
  }

  return entries;
}

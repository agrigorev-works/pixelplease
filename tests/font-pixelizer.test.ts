import { describe, expect, it } from "vitest";
import opentype from "opentype.js";
import {
  cellsToPath,
  dilateMask,
  getBasicLatinCoverage,
  getGridPixelsPerEm,
  type CellMask,
  type FontMetrics,
} from "../src/font-pixelizer";
import { createCellMaskFromImageData } from "../src/pixel-grid";
import { buildNoticeText, createStoredZip } from "../src/download-package";
import {
  GA_CONSENT_DEFAULT,
  GA_MEASUREMENT_ID,
  getGoogleTagScriptSrc,
  shouldEnableAnalytics,
} from "../src/analytics";

const metrics: FontMetrics = {
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
};

describe("font pixelizer core", () => {
  it("enables analytics only on the final production domain", () => {
    expect(shouldEnableAnalytics("pixelplease.tools")).toBe(true);
    expect(shouldEnableAnalytics("www.pixelplease.tools")).toBe(true);
    expect(shouldEnableAnalytics(" Pixelplease.Tools ")).toBe(true);

    expect(shouldEnableAnalytics("127.0.0.1")).toBe(false);
    expect(shouldEnableAnalytics("localhost")).toBe(false);
    expect(shouldEnableAnalytics("192.168.0.33")).toBe(false);
    expect(shouldEnableAnalytics("pixelplease-mc6f2.ondigitalocean.app")).toBe(false);
  });

  it("uses the configured GA4 measurement id", () => {
    expect(GA_MEASUREMENT_ID).toBe("G-717BB12JJ8");
    expect(getGoogleTagScriptSrc()).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-717BB12JJ8",
    );
  });

  it("allows production pageview analytics while denying ad signals", () => {
    expect(GA_CONSENT_DEFAULT).toEqual({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  });

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

  it("can draw filled cells as round pixel paths", () => {
    const mask: CellMask = {
      cols: 2,
      rows: 1,
      cells: Uint8Array.from([1, 1]),
    };

    const path = cellsToPath(mask, metrics, {
      pixelsPerEm: 10,
      threshold: 0.5,
      expand: 0,
      pixelShape: "round",
    });
    const moveCommands = path.commands.filter((command) => command.type === "M");
    const curveCommands = path.commands.filter((command) => command.type === "C");
    const lineCommands = path.commands.filter((command) => command.type === "L");

    expect(moveCommands).toHaveLength(2);
    expect(curveCommands).toHaveLength(8);
    expect(lineCommands).toHaveLength(0);
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

  it("creates cell masks from raster data for both exported glyphs and live preview", () => {
    const data = Uint8ClampedArray.from([
      0, 0, 0, 255,
      255, 255, 255, 255,
    ]);

    const alphaMask = createCellMaskFromImageData({
      data,
      width: 2,
      height: 1,
      cellSize: 1,
      threshold: 0.5,
      mode: "alpha",
    });
    const darknessMask = createCellMaskFromImageData({
      data,
      width: 2,
      height: 1,
      cellSize: 1,
      threshold: 0.5,
      mode: "darkness",
    });

    expect(Array.from(alphaMask.cells)).toEqual([1, 1]);
    expect(Array.from(darknessMask.cells)).toEqual([1, 0]);
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

  it("snaps the pixel grid to a clean units-per-em divisor", () => {
    expect(getGridPixelsPerEm(metrics, { pixelsPerEm: 18, threshold: 0.5, expand: 0 })).toBe(20);

    const powerOfTwoMetrics = { ...metrics, unitsPerEm: 2048 };
    expect(getGridPixelsPerEm(powerOfTwoMetrics, { pixelsPerEm: 20, threshold: 0.5, expand: 0 })).toBe(16);
  });

  it("packages generated fonts with a notice file", () => {
    const notice = buildNoticeText("pixelplease-Font", {
      sourceName: "Fixture Sans",
      sourceFileName: "fixture-source.ttf",
      sourceLicense: "OFL",
      sourceLicenseFileName: "fixture-OFL.txt",
      sourceLicensePackagePath: "licenses/fixture-OFL.txt",
      sourceUrl: "https://example.com/fixture-source.ttf",
    });
    const zip = createStoredZip([
      { name: "pixelplease-Font.ttf", data: Uint8Array.from([1, 2, 3]) },
      { name: "NOTICE.txt", data: notice },
      { name: "licenses/fixture-OFL.txt", data: "Fixture license text" },
    ]);
    const entries = readStoredZip(zip);

    expect(Object.keys(entries).sort()).toEqual([
      "NOTICE.txt",
      "licenses/fixture-OFL.txt",
      "pixelplease-Font.ttf",
    ]);
    expect(entries["pixelplease-Font.ttf"]).toEqual(Uint8Array.from([1, 2, 3]));
    expect(new TextDecoder().decode(entries["NOTICE.txt"])).toContain("Fixture Sans");
    expect(new TextDecoder().decode(entries["NOTICE.txt"])).toContain("licenses/fixture-OFL.txt");
    expect(new TextDecoder().decode(entries["licenses/fixture-OFL.txt"])).toContain("Fixture license");
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

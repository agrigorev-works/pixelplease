import opentype from "opentype.js";

export function createFixtureFont(): opentype.Font {
  const glyphs = [
    new opentype.Glyph({ name: ".notdef", advanceWidth: 500, path: notDefPath() }),
    new opentype.Glyph({ name: "space", unicode: 32, advanceWidth: 320, path: new opentype.Path() }),
  ];

  for (const char of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.") {
    glyphs.push(
      new opentype.Glyph({
        name: char,
        unicode: char.charCodeAt(0),
        advanceWidth: char === "." ? 260 : 680,
        path: glyphPath(char),
      }),
    );
  }

  return new opentype.Font({
    familyName: "Fixture Sans",
    styleName: "Regular",
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs,
  });
}

function glyphPath(char: string): opentype.Path {
  const path = new opentype.Path();
  const code = char.charCodeAt(0);
  const left = 80 + (code % 5) * 10;
  const right = char === "." ? 180 : 600 - (code % 4) * 10;
  const top = char === "." ? 120 : 700 - (code % 3) * 20;
  const middle = 340 + (code % 4) * 20;

  addRect(path, left, 0, right, top);

  if (/[A-Z]/.test(char)) {
    addRect(path, left + 120, 120, right - 120, top - 120, true);
    addRect(path, left + 80, middle, right - 80, middle + 90);
  } else if (/[a-z]/.test(char)) {
    addRect(path, left + 90, 120, right - 90, top - 90, true);
  } else if (/[0-9]/.test(char)) {
    addRect(path, left + 100, 140, right - 100, top - 140, true);
  }

  return path;
}

function notDefPath(): opentype.Path {
  const path = new opentype.Path();
  addRect(path, 40, -120, 460, 760);
  addRect(path, 110, -40, 390, 680, true);
  return path;
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

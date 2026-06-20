# pixelplease

pixelplease is an MVP prototype for turning a local font file into a pixelized, downloadable TTF.

This branch contains a minimal mono, three-column variation of the first proof of concept:

- upload a local `.ttf` / `.otf` file;
- drag and drop a font file inside the Source column;
- parse glyphs with `opentype.js`;
- show source glyph count and Basic Latin coverage;
- apply a simple pixelization effect;
- tune pixels-per-em, threshold, expand, and X/Y grid shift;
- edit the source text directly in the Source preview;
- compare Source and Pixel Output at matching preview size/line-height;
- try the effect before uploading a font;
- update the generated preview automatically when pixel controls change;
- preview before/after sample text;
- download a generated `.ttf`;
- verify the generated font can be parsed and loaded in the browser.

## Branch

Current variation branch:

```text
variation-light-terminal-ui
```

Base MVP branch:

```text
mvp-local-font-pixelizer
```

Future visual or algorithmic variations can continue to live in separate branches.

## Run

```bash
npm install
npm run dev -- --port 5173
```

Then open:

```text
http://127.0.0.1:5173/
```

## Test

```bash
npm run verify
```

The smoke test downloads a permissive Google Fonts sample, `Lato-Regular.ttf`, into `samples/` and uses it only as a local test fixture.

## MVP Limits

- Basic Latin export only.
- No kerning, ligatures, hinting, WOFF2, variable-font support, or production metadata cleanup.
- The algorithm is intentionally simple: rasterize glyphs to a grid, optionally offset the sampling grid, sample filled cells, optionally expand cells, convert horizontal filled runs into rectangular outlines, then build a derivative TTF.

Only upload fonts you have the right to modify.

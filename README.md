# pixelplease

pixelplease is an MVP prototype for turning a local font file into a pixelized, downloadable TTF.

This branch contains a minimal mono, three-column variation of the first proof of concept:

- switch Source between `Google Font` and `Your Font` modes;
- choose from a small permissive Google Fonts list;
- start each session with a random demo font;
- upload a local `.ttf` / `.otf` through a same-size Source drop zone;
- remind users to upload only fonts they have a license to edit;
- parse glyphs with `opentype.js`;
- apply a simple pixelization effect;
- tune pixels-per-em, threshold, expand, and X/Y grid shift;
- reset pixel controls to defaults;
- edit the source text directly in the Source preview;
- compare Source and Pixel Output at matching preview size/line-height;
- generate automatically after Google Font selection, local upload, and pixel control changes;
- preview before/after sample text;
- download a `.zip` package containing the generated `.ttf` and `NOTICE.txt`;
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
- No kerning, ligatures, hinting, WOFF2, variable-font support, or production metadata cleanup beyond basic release-safety names and notice packaging.
- The algorithm is intentionally simple: rasterize glyphs to a grid, optionally offset the sampling grid, sample filled cells, optionally expand cells, convert horizontal filled runs into rectangular outlines, then build a derivative TTF.
- Generated font family names use the product-owned `Pixelplease Test` name rather than preserving source family names, to avoid Reserved Font Name reuse.
- Download packages include `NOTICE.txt`; user-uploaded font licenses still need manual verification before redistribution.

Only upload fonts you have the right to modify.

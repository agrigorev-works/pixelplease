# pixelplease

pixelplease is a browser-based pixel font generator that turns Google Fonts or uploaded TTF/OTF files into downloadable pixel-style fonts.

The app is static and client-side: uploaded fonts are read in the browser and are not sent to a server. pixelplease does not require registration or login, and it does not store uploaded fonts, sample text, or generated TTF data.

## Current App

The working product:

- switch Source between `Select font` and `Upload font` modes;
- choose from a curated permissive Google Fonts list with available weights and styles;
- start each session with a deterministic bundled Merriweather font;
- upload a local `.ttf` / `.otf` through a same-size Source drop zone;
- remind users to upload only fonts they have a license to edit;
- state that uploaded fonts stay in the browser and do not require registration, login, or server storage;
- parse glyphs with `opentype.js`;
- choose pixel effects: pixels, dots, vertical lines, and horizontal lines;
- tune density, threshold, expand, and X/Y grid shift;
- reset pixel controls to defaults;
- edit the source text directly in the Source preview;
- compare Source and Pixel Output at matching preview size/line-height;
- generate automatically after Google Font selection, local upload, effect selection, and control changes;
- preview before/after sample text;
- download a uniquely named `.zip` package containing the generated `.ttf`, `NOTICE.txt`, and bundled source license material when applicable;
- verify the generated font can be parsed and loaded in the browser.

## Branch

`main` is the default branch and the source of truth for the website and repository docs.

Historical visual and algorithm branches may remain in the repository, but public-facing copy and releases should be based on `main`.

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

`npm run verify` checks the social preview asset size, runs Vitest, builds the app, prepares local font samples, and runs the main Playwright smoke suite.

Before launch or after layout-sensitive changes, also run:

```bash
npm run test:launch
```

The launch sanity suite runs against Chromium, Firefox, WebKit, and a mobile Chromium viewport. It also includes a 375px viewport check that guards against horizontal overflow and keeps the source, output, controls, and download action reachable.

GitHub Actions runs `npm run verify` and `npm run test:launch` on pushes to `main` and on pull requests. Playwright WebKit gives Safari-like browser coverage in CI; real iPhone Safari remains a manual spot-check unless a device/browser-cloud runner is added.

The smoke and launch tests copy the bundled permissive Google Fonts sample, `Lato-Regular.ttf`, into `samples/` and use it only as a local test fixture.

## Release Notes

- Demo Google Fonts are vendored in `public/fonts/google/` so the production app does not depend on `raw.githubusercontent.com` at runtime.
- Bundled demo font license files are vendored per family in `public/fonts/google/licenses/`.
- The upstream Google Fonts URLs are still kept in generated `NOTICE.txt` packages for source traceability.
- Favicon and app icon assets are served from `public/`.
- Social preview metadata points to `https://pixelplease.tools/og-image-20260623.png`.
- `npm run verify` checks that social preview images stay at the required 1200x630 size.
- LLM-friendly product context is available at `/llms.txt` in deployed builds.
- GA4 is gated to `pixelplease.tools` and `www.pixelplease.tools`; local previews and temporary deployment hosts do not load analytics. Production consent defaults allow pageview analytics and deny ad signals.
- `npm run test:launch` runs a small launch sanity suite across Chromium, Firefox, WebKit, and a mobile Chromium viewport.
- Mobile/coarse-pointer first run avoids auto-focusing the Source textarea so the keyboard does not immediately cover the app.
- SEO and launch planning live in `docs/seo-proposal.md`, `docs/product-brief.md`, `docs/workflow.md`, and `docs/release-checklist.md`.

## Current Boundaries

- Basic Latin export only.
- No kerning, ligatures, hinting, WOFF2, variable-font support, or production metadata cleanup beyond basic release-safety names and notice packaging.
- The algorithm is intentionally simple: rasterize glyphs to a grid, optionally offset the sampling grid, sample filled cells, optionally expand cells, convert horizontal filled runs into rectangular outlines, then build a derivative TTF.
- Generated font names start with product-owned `PixelPlease`, then add a compact source code, effect recipe, short hash, and style so multiple exports can install side by side without preserving source family names verbatim.
- Download packages include `NOTICE.txt`; bundled demo packages also include the source OFL file under `licenses/`.
- User-uploaded font licenses still need manual verification before redistribution.

## License

pixelplease source code is released under the MIT License. See `LICENSE`.

Bundled Google Fonts are distributed under their own SIL Open Font License files in `public/fonts/google/licenses/`. Generated pixel fonts are derivative fonts, so the source font license still controls use, modification, and redistribution of each generated output.

Only upload fonts you have the right to modify.

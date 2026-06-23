# pixelplease product brief

## Positioning

pixelplease is a browser-based pixel font generator for graphic designers, interface designers, and type experimenters. It takes a source font, applies a pixel-grid transformation, lets the user preview and tune the result, and exports a usable test TTF rather than a static image effect.

The sharp product promise:

> Turn a normal font into a usable pixel-style test TTF in the browser.

SEO headline direction:

> The fastest way to create a custom pixel font.

## Target Users

- Product, brand, and poster designers who need a quick pixel/retro type treatment without drawing a full typeface.
- Interface designers making game-like, terminal-like, lo-fi, or experimental UI concepts.
- Indie game makers and creative coders who want a fast TTF starting point.
- Type-curious creators who want to remix permissive fonts, with clear license reminders.

## Core Journey

1. Pick a bundled permissive demo font or upload a local TTF/OTF.
2. Edit the sample text to judge the result on real copy.
3. Tune pixel density, threshold, expand, and grid shift.
4. Compare source and pixel output side by side.
5. Download a ZIP with generated TTF and `NOTICE.txt`.
6. Install the generated `.ttf` and test it in design tools, interface mockups, posters, or any app that accepts TTF fonts.

## Privacy Boundary

pixelplease should feel safe because the tool does not need user accounts or server-side font handling. Uploaded TTF/OTF files are read inside the browser for the current session, transformed locally, and packaged locally for download. The app must not upload, store, or analyze source fonts, sample text, or generated TTF data.

## What The Effect Should Preserve

- Overall source-font personality: serif/sans/mono feel, width, contrast, and rhythm.
- Basic proportions: ascenders, descenders, x-height/cap-height relationship.
- Readability at preview sizes.
- A visible pixel-grid treatment that feels intentional, not just degraded.

## MVP Export

Current MVP export is intentionally narrow:

- ZIP package with generated `.ttf`.
- `NOTICE.txt` with source name, source file, license, upstream URL where relevant, and redistribution warning.
- Bundled demo exports include the matching source OFL text under `licenses/`; user-upload exports do not invent license files.
- Basic Latin glyph range.
- Product-owned generated family naming (`pixelplease-Font`) to avoid reusing source Reserved Font Names.

Future exports can add WOFF2, CSS snippets, glyph sheets, and named presets, but those are not launch blockers.

## Decision Gate

Go for public MVP if:

- A user can understand the app within one screen and get a TTF in under one minute.
- Generated fonts parse, load, and type in browser tests.
- The demo-font path is self-contained and does not require runtime downloads from GitHub raw.
- Privacy and licensing boundaries are visible: no registration/login, user uploads stay local, bundled demo fonts are permissive, and redistribution responsibility is clear.
- SEO page framing explains the tool without turning the app into a generic landing page.

No-go if:

- Exported fonts regularly fail to parse/load.
- The generated output looks like broken raster damage rather than a designed pixel treatment.
- The product implies users can freely redistribute transformed commercial fonts.
- Public launch depends on unstable external font URLs.

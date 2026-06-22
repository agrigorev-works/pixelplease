# pixelplease MVP workflow and controls

## First Screen

The app should open directly into the working tool, not a marketing landing page.

Current first-screen structure:

- Source panel: Google Font / Upload Font segmented control, demo selector, editable sample text, or upload drop zone.
- Pixel Output panel: generated preview canvas and fallback/status text.
- Settings panel: pixel controls, reset, and download.

## States

- Demo loading: selected bundled demo font is loading/parsing.
- Demo ready: Merriweather source is active and pixel output is generated automatically.
- Upload mode empty: user sees drop zone and license reminder.
- Upload parsing: app parses the local font in-browser.
- Generated ready: download link is enabled.
- Error: app keeps the UI usable and explains whether source loading, parsing, or generation failed.

## Minimum Controls

Keep only controls that change the current algorithm in obvious ways:

- `pixels-per-em`: pixel grid density.
- `threshold`: fill cutoff.
- `expand`: grow filled cells for heavier output.
- `shift-x`: horizontal sampling grid offset.
- `shift-y`: vertical sampling grid offset.
- `reset defaults`: return to the known-good baseline.

## Explicitly Out Of Scope For v0

- Full glyph coverage beyond Basic Latin.
- Kerning, ligatures, hinting, variable-font preservation, and production-grade font metadata.
- WOFF2 export and CSS kit export.
- Accounts, saved projects, server-side font processing, or upload storage.
- Advanced style presets until the baseline transform is reliable.

## Release Acceptance

- `npm run verify` passes.
- Default demo loads without network calls to Google Fonts or GitHub raw.
- Upload mode works with local TTF fixture.
- Downloaded package contains generated TTF plus notice, and includes bundled source license material for demo-font exports.
- Desktop and mobile smoke tests preserve layout and do not hide primary controls.

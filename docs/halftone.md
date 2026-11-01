# Halftone — 1 November 2026

The fifth effect is `halftone` (between dots and vertical lines). It uses the existing canvas sampler and opentype.js outline pipeline; no image filter, external service or new dependency is needed.

- `CellMask.coverage` retains average ink per cell independently of the binary threshold mask.
- Active cells become circles with radius `0.45 * cellSize * sqrt(coverage)`. Dot area follows coverage, with a 10% inter-cell gap at full coverage.
- Threshold still rejects faint cells. Expand propagates maximum coverage from active neighbours; rejected cells cannot independently seed dilation. Shift and density retain their existing behavior.
- Canvas preview and font contours share `getHalftoneRadius`. The halftone preview samples black source ink independently of display color.
- Binary masks without coverage remain supported. Zero, negative and non-finite coverage produce no outline; coverage above one is clamped.
- Generated fonts retain Basic Latin, derivative naming/hash and license-package rules. Existing dots keep constant diameter; halftone uses variable diameter.

## Regression found during verification

A rapid effect change back to the installed logo shape previously returned before invalidating a pending asynchronous logo generation. The obsolete result could overwrite the requested shape. Run identity is now invalidated before that early return. A dedicated rapid-halftone-reset test failed with the old logic (logo remained halftone) and passes after the fix.

## Verification

- Four new unit checks failed before implementation, then passed: continuous coverage, proportional dot area, coverage dilation, binary/invalid-value handling.
- The browser halftone test initially failed because the option was absent. It now verifies UI selection, distinct preview, variable-size contours in the actual ZIP font, license preservation, FontFace loading, mobile controls and reset.
- `npm run verify`: 20 unit tests and 41 Chromium browser tests passed, including the existing export and upload regressions.
- `npm run test:launch`: 8 checks passed across Chromium, mobile Chromium, Firefox and WebKit.
- Three targeted WebKit checks passed: halftone, rapid reset and all-effect switching.
- Uploaded real Lato TTF tested separately at 390px in Chromium/WebKit; output contains curves, blank space glyph and no page overflow.
- Default desktop/mobile previews and enlarged 104px text inspected. At very small sizes WebKit rasterizes ordinary 2px dots identically to square cells (confirmed identical pixel hashes); the all-effect comparison now waits for debounced generation and uses a larger preview to distinguish those shapes reliably.
- A longer SEO heading overflowed at 320px and was shortened. Main description, LLM effect lists and homepage sitemap date updated; article dates/URLs remain unchanged.

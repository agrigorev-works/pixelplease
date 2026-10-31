# Pixelplease guide research — 31 October 2026

## Scope and evidence quality

Task: ten question-led English guides, linked from the footer, in the existing pixelplease style. Keep the generator untouched. Reuse the two existing general guide URLs rather than compete with them; add eight new pages. Preserve Pixel Inter and Pixel Merriweather examples. No new packages or framework needed: the existing Vite public-directory pipeline serves static HTML.

Selection uses English Google autocomplete (raw responses in the adjacent JSON file), Brave SERPs, existing product FAQs, and task relevance. This is qualitative demand evidence, **not measured monthly volume or a statistically ranked top ten**. Suggestions are location/time dependent and can include irrelevant Google Pixel phone queries. Exclude those. Installation has weak pixel-specific autocomplete evidence; retain it as an essential downstream task supported by Figma/OS documentation and product export intent.

## Selected clusters and distinct intent

| Question / canonical slug | Query evidence | Page job |
| --- | --- | --- |
| how-to-make-a-pixel-font | “how to make a pixel font”, “how to make a custom pixel font” suggestions; multiple generator results | Beginner creation workflow; reuse URL |
| convert-ttf-to-pixel-font | Conversion SERPs; “convert ttf to bitmap font” adjacent suggestion | Input/output compatibility, not PNG-to-TTF; reuse URL |
| what-is-a-pixel-font | Exact definition suggestion; bitmap/TTF comparison SERPs | Explain appearance vs storage format |
| google-fonts-to-pixel-font | “pixel font google fonts”, “best pixel font google fonts” | Source selection and bundled-font workflow, not an unsupported best-font ranking |
| fix-blurry-pixel-font | “pixel font blurry godot”, “unity pixel font blurry”; repeated Godot forum questions | Troubleshooting: broken glyph vs rasterization |
| install-pixel-font | Broad installation task and official OS documentation; noisy Google Pixel suggestions rejected | ZIP → installed family → troubleshooting |
| use-pixel-font-in-figma | “pixel font figma”, “pixel font name in figma”, add-font questions | Local font access, browser helper, team handoff |
| pixel-font-commercial-use | “pixel font free commercial use”, “pixel art font commercial use” | Separate use/modification/distribution rights |
| use-pixel-font-on-website | “pixel font css”, “pixel font html css”; Stack Overflow questions | Minimal @font-face example and checks |
| pixel-font-for-games | “best pixel font for games”, “pixel art font for games” | Engine format and real-resolution readability checklist |

## Search result evidence

Queries inspected on 31 October 2026:
- `pixel font how to make pixel font convert ttf pixelated font blurry small size`
- `pixel font generator font commercial use google fonts figma install pixel font`
- `pixel font blurry size Godot pixel font game best font`
- `pixel font CSS website TTF bitmap font difference`
- Official Figma, Microsoft and Google Fonts lookup queries.

Representative intent evidence, not technical authorities:
- https://yal.cc/tools/pixel-font/ — image-to-TTF tool, distinct from pixelplease’s outline-input workflow.
- https://www.figma.com/fonts/pixel/ — pixel-font category.
- https://forum.godotengine.org/t/why-pixel-font-blurry-godot-4/735
- https://forum.godotengine.org/t/font-blurry-causing-frustration/99880
- https://stackoverflow.com/questions/23619946/pixel-fonts-and-websites-css-html

## Technical and product sources

Primary documentation read: Figma Add a font; Apple Font Book installation/validation (readability extraction was partial); Microsoft Add a font; Microsoft OpenType file specification; SIL OFL FAQ and modification guidance; MDN @font-face and image-rendering; Godot Using fonts. Exact URLs are centralized in `scripts/data/pixel-guides.mjs` and linked in articles. Google Fonts FAQ redirected to its JS site; commercial-use statement was checked in the official-domain search result, and licensing detail is grounded in SIL documentation and bundled OFL files rather than snippets alone.

Product claims checked against README, `src/interface-copy.ts`, `src/font-pixelizer.ts`, `src/pixel-grid.ts`, and download-package behavior. Boundaries: Basic Latin U+0020–U+007E, outline font output labelled TTF, no bitmap atlas, WOFF2, kerning, hinting, ligatures or variable-axis preservation. Effective grid snaps to a divisor of unitsPerEm when available. Higher threshold fills fewer cells, expand grows occupied cells. Figma platform differences and CSS image-vs-font rendering are explicit.

No claims of exact popularity, guaranteed rankings, guaranteed engine compatibility, universal commercial rights, or support for every language. Example strings and CSS are illustrative, not customer evidence. Publisher is pixelplease, not an invented personal reviewer. Article copy remains English like the existing site.

## Implementation notes

- Ten static articles; root app and both family examples get a shared static footer.
- Existing main app, FAQ, creator credit, controls and export behavior preserved.
- Shared monochrome CSS uses the current monospaced stack, grey body text, thin dividers, pill-shaped CTA and acid selection/focus accent.
- Canonical URLs, descriptions, social metadata, Article/Breadcrumb data, source and contextual links, sitemap and LLM references included.
- Pre-existing local changes at intake: `public/sitemap.xml` dates July 9 → July 12; untracked `CLAUDE.md` and `docs/code-review-seo-report-2026-07-13.md`. Preserve the untracked files; keep July 12 dates for unchanged family-example content. A before-snapshot of sitemap was stored in `/tmp/pixelplease-sitemap-before-guides.xml`.

## Verification

- Added four focused static-content checks before implementation; all four failed on missing guide pages, CTA/footer coverage and sitemap entries, then passed after implementation.
- `npm run verify`: 16 unit tests and 39 Chromium browser tests passed; metadata/LLM checks and production build passed.
- `npm run test:launch`: 8 checks passed across Chromium, mobile Chromium, Firefox and WebKit, including generation and download readiness.
- `npx playwright test tests/guides.spec.ts --browser=webkit`: 4 checks passed, covering every guide without JavaScript at 1440, 390 and 320 px plus the functioning generator CTA.
- Visually inspected desktop article/footer and mobile article/code examples. Fixed pre-existing Merriweather example heading overflow at 320 px with a narrowly scoped font-size rule; updated old smoke expectations only where the rewritten copy intentionally changed.
- Re-running the guide/sitemap pipeline left all 16 generated/integrated files byte-identical. `git diff --check` passed. Core generator implementation unchanged.

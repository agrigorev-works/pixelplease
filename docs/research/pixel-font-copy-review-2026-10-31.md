# Pixelplease guide copy review — 31 October 2026

Scope: review all ten newly published guides, apply useful search-language/content improvements, remove the divider above the shared footer. Preserve canonical URLs, product behavior, sources and the existing visual style.

## Findings and applied changes

The initial pages already have distinct titles, canonical URLs, crawlable HTML, internal links and sitemap entries. More repeated keywords would not resolve an indexing blocker. The useful opportunities are clearer task-specific subheadings, related intent distinctions and concrete examples. No fixed keyword-density or word-count target was used.

| Page | Improvement applied |
| --- | --- |
| Make a pixel font | Explain the free online font-generator workflow immediately; distinguish transforming a font from drawing a new alphabet. |
| TTF/OTF conversion | Explicitly answer the adjacent TTF-to-bitmap query without claiming bitmap-atlas export support. |
| Pixel vs bitmap | Explain “pixel art”, “retro” and “8-bit” as visual terms, not a universal 8px size or storage format. |
| Google Fonts | Compare custom generation with two real ready-made alternatives, Press Start 2P and Silkscreen; clarify that neither is currently bundled. Update title/description to match this comparison. |
| Blurry pixel font | Make size/zoom/Godot/CSS subheadings more descriptive; distinguish live text from a downscaled image export. |
| Installation | Use a troubleshooting heading; test in a simple desktop text app to separate system installation from application access problems. |
| Figma | Use “add a custom pixel font” in the title; explain missing-font family/style mismatches and deliberate replacement. |
| Commercial use | Answer OFL/free-commercial-use intent with an actual logo-versus-TTF handoff example, preserving the conditions. |
| Website CSS | Complete the CSS example with HTML usage and explain synthesized bold; retain fallback/loading/license guidance. |
| Games | Address “best pixel font for games” through a concrete menu/score/dialogue comparison, not an unsupported ranking. |

The shared footer divider is removed. Spacing, typography, link targets and other separators remain unchanged. Stylesheet revision incremented for cache refresh. Article modification dates remain 31 October: both publication and this review happened that day. No URLs, schema types or robots rules were changed.

## Evidence and limits

- Query language: the original autocomplete JSON and research report in this directory; no new claims of measured search volume.
- Google SEO Starter Guide, fetched 31 October: https://developers.google.com/search/docs/fundamentals/seo-starter-guide — descriptive headings, useful unique content, anticipate search terms without needing every exact variant.
- Google title-link guidance: https://developers.google.com/search/docs/appearance/title-link — descriptive distinct titles, avoid repeated keyword lists.
- Ready-made font descriptions checked directly in Google Fonts' repository:
  - https://github.com/google/fonts/blob/main/ofl/pressstart2p/DESCRIPTION.en_us.html
  - https://github.com/google/fonts/blob/main/ofl/silkscreen/DESCRIPTION.en_us.html
- Other claims remain grounded in the primary sources linked in each article and the current product implementation.

No ranking or indexing guarantee. Search Console query/impression data would be the appropriate next input for evaluating which real queries need better answers after crawling, rather than adding more synonyms speculatively.

## Verification

Copy and a reversible border-style edit reuse the existing regression checks; no literal keyword-density tests were added. `npm run verify` passed (16 unit tests, 39 Chromium tests, production build, metadata and LLM checks). The four guide checks also passed in WebKit at 1440/390/320 px, including the generator CTA. A separate browser check confirmed all 13 shared footers have 0px top borders and ten intact links at 1440 and 390 px in Chromium and WebKit. The desktop footer screenshot was visually inspected. `git diff --check` passed.

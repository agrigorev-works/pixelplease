# pixelplease release checklist

## Done

- Core font upload, parsing, pixelization, preview, and TTF ZIP export.
- Side-by-side Source and Pixel Output workflow.
- Live controls for pixel density, threshold, expand, and X/Y shift.
- License-aware generated package notice.
- Per-family OFL files for bundled demo fonts.
- RFN-safe generated font naming.
- Bundled demo fonts for runtime independence from GitHub raw.
- Basic SEO head tags in `index.html`.
- Favicon and app icon assets.
- Final domain canonical URL and `og:url`.
- Root domain launch target is `https://pixelplease.tools/`; `www` is not promoted, though the production analytics gate allows it defensively.
- Social preview image and `og:image` / Twitter image metadata.
- `robots.txt` and `sitemap.xml`.
- Root `/llms.txt` AI-discovery context file.
- Below-app FAQ section with `FAQPage` structured data.
- Dedicated FAQ privacy item near the top: no registration/login, no uploaded font storage, and no font/sample/output analytics.
- GA4 pageview analytics for `pixelplease.tools`, disabled on local and temporary hosts, with ad signals denied in consent defaults.
- GitHub Actions CI runs `npm run verify` and `npm run test:launch` on pushes to `main` and pull requests.
- Cross-browser launch sanity coverage.
- Mobile/coarse-pointer first run does not autofocus the Source textarea, and local-only upload privacy copy is visible.
- Generated ZIP package license spot-check: demo exports include bundled OFL text; user uploads do not invent a license URL.
- Product brief, workflow guide, and SEO proposal.

## Before Public Repository

- Add or verify Search Console for `https://pixelplease.tools/`.
- Decide whether historical experiment branches should stay visible after the repository becomes public.
- Optional final real-device spot check in Safari/iPhone before switching repository visibility.

## Nice Next Iterations

- WOFF2 export.
- Presets for sharp, heavy, tiny, display, and text-friendly output.
- Glyph sheet preview.
- Example gallery generated from bundled fonts.

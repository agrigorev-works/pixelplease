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
- Social preview image and `og:image` / Twitter image metadata.
- `robots.txt` and `sitemap.xml`.
- Root `/llms.txt` AI-discovery context file.
- GA4 pageview analytics for `pixelplease.tools`, disabled on local and temporary hosts.
- Cross-browser launch sanity coverage.
- Mobile/coarse-pointer first run does not autofocus the Source textarea, and local-only upload privacy copy is visible.
- Generated ZIP package license spot-check: demo exports include bundled OFL text; user uploads do not invent a license URL.
- Product brief, MVP workflow, and SEO proposal.

## Before Public URL

- Add Search Console after DNS is live.
- Add GitHub Actions CI after GitHub credentials allow pushing workflow files.
- Optional final real-device spot check in Safari/iPhone after DNS finishes propagating.
- Decide whether `www.pixelplease.tools` should be added as a DNS/app alias.

## Nice Next Iterations

- WOFF2 export.
- Presets for sharp, heavy, tiny, display, and text-friendly output.
- Glyph sheet preview.
- Example gallery generated from bundled fonts.
- Self-contained `/examples` or `/faq` content section under the app for SEO depth.

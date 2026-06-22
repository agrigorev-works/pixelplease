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
- Root `/llms.txt` AI-discovery context file.
- Product brief, MVP workflow, and SEO proposal.

## Before Public URL

- Pick final domain and add canonical URL plus `og:url`.
- Add social preview image.
- Decide whether launch URL is `.app`, `.design`, `.studio`, or another final domain.
- Re-check generated ZIP packages include the bundled source license file for demo fonts and no unverified license URL for user uploads.
- Run final manual browser sanity: Chrome, Safari, Firefox, iPhone width, and a larger uploaded font.
- Add `robots.txt` and `sitemap.xml` once the final URL is known.
- Add Search Console after DNS is live.

## Nice Next Iterations

- WOFF2 export.
- Presets for sharp, heavy, tiny, display, and text-friendly output.
- Glyph sheet preview.
- Example gallery generated from bundled fonts.
- Self-contained `/examples` or `/faq` content section under the app for SEO depth.

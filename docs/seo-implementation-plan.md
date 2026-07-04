# pixelplease SEO Implementation Plan

Date: 2026-07-04

Source: `docs/seo-recommendations.md`

## Verdict

The recommendations are valid and match the current repo state. The strongest confirmed issue is not missing metadata; it is that the most important crawler-readable page content is still empty in static HTML and populated by JavaScript.

Confirmed current state:

- `index.html` already has a strong title, meta description, canonical URL, OG/Twitter cards, `SoftwareApplication` JSON-LD, `FAQPage` JSON-LD, `robots.txt`, `sitemap.xml`, and `/llms.txt`.
- The homepage H1 and intro paragraph are empty in static HTML and filled from `UI_COPY` by `src/main.ts`.
- The site has one indexable URL, which limits coverage of the keyword clusters from `docs/seo-proposal.md`.
- `public/sitemap.xml` has a hardcoded `<lastmod>2026-06-25</lastmod>`.
- SEO regression coverage already exists in `tests/font-pixelizer.spec.ts`.

## Principles

- Keep the working tool as the first screen. SEO copy should support the tool below the app, not replace it.
- Keep claims factual: pixelplease is a browser-based pixel font generator that creates downloadable pixel-style TTF packages from bundled Google Fonts or uploaded TTF/OTF files.
- Do not claim full font-editor, WOFF2, CSS kit, or production font-foundry capabilities.
- Keep privacy copy strict: uploaded fonts, sample text, and generated font data stay client-side and are not sent to analytics.
- Avoid "test fonts" wording for output. Use "generated pixel fonts", "pixel-style TTFs", or "downloadable pixel fonts".
- Add long-tail pages only when each page has unique content, examples, and a real intent. Avoid doorway pages.

## Phase 1 - Foundation Fixes

Goal: make the existing homepage fully understandable to non-JS crawlers and LLM crawlers.

Implement:

- Pre-render the logo text and intro copy in `index.html`.
  - Fill `<h1 id="logo-title" aria-label="pixel please">` with the existing `pixel` / `please` spans.
  - Fill `.intro-copy` with the same copy as `UI_COPY.intro.copy`.
  - Keep the JS assignment in `src/main.ts`; it can remain idempotent.
- Add "free" to title, description, and visible copy only if pixelplease is intentionally free as a product policy.
  - If added to structured data as price `0`, make sure the visible page also says the tool is free.
  - Keep the phrasing specific to the tool, not broad "free pixel fonts" traffic.
- Extend `SoftwareApplication` JSON-LD.
  - Add `offers` with price `0` only if the free positioning is approved.
  - Add `featureList` for factual capabilities: TTF/OTF upload, bundled Google Fonts, local browser processing, pixel effect controls, generated TTF package download.
  - Add `screenshot` only if the referenced asset honestly shows the app or generated output.
- Add a preload for the default Merriweather font used on first load.
  - Candidate: `/fonts/google/merriweather/Merriweather-var.ttf`.
  - Verify browser console does not warn about an unused preload.
- Automate or validate sitemap `lastmod`.
  - Add a small script in `scripts/`, similar in style to `scripts/check-og-image.mjs`.
  - Avoid freezing Playwright tests to a stale hardcoded date.

Tests:

- Update `tests/font-pixelizer.spec.ts` to assert static and visible H1/intro content.
- Update metadata/schema assertions for `offers`, `featureList`, and `screenshot` if added.
- Update sitemap checks so they reflect the new `lastmod` behavior.

Verification:

```bash
npm run build
npm run verify
npm run test:launch
```

Manual crawler sanity after deploy:

```bash
curl -L https://pixelplease.tools/ | rg "pixel please|pixel font generator|free"
curl -A "GPTBot" -L https://pixelplease.tools/ | rg "pixel please|pixel font generator"
curl -A "ClaudeBot" -L https://pixelplease.tools/ | rg "pixel please|pixel font generator"
```

## Phase 2 - Indexation And Hosting Ops

Goal: make sure search engines and AI crawlers can reach the finished page.

External actions:

- Google Search Console:
  - verify `pixelplease.tools`;
  - submit `https://pixelplease.tools/sitemap.xml`;
  - request indexing for `/`;
  - check page indexing after deploy.
- Bing Webmaster Tools:
  - verify the domain;
  - submit the sitemap;
  - request crawling for `/`.
- Hosting/CDN:
  - confirm `www.pixelplease.tools` redirects to `https://pixelplease.tools/` or intentionally remains unused;
  - confirm CDN/WAF rules do not block GPTBot, ClaudeBot, PerplexityBot, CCBot, Googlebot, or Bingbot.

Acceptance:

- `/robots.txt` returns `200` and references the sitemap.
- `/sitemap.xml` returns `200` and uses the apex domain only.
- There is no duplicate crawlable `www` homepage.
- Search Console and Bing both show the sitemap as submitted.

## Phase 3 - Below-App Content

Goal: expand crawler-readable content without turning the tool into a generic landing page.

Add one compact static section below the app:

- `Make a usable pixel font`
  - Start from a bundled Google Font or uploaded licensed TTF/OTF.
  - Tune grid size, threshold, expand, shift, and effects for pixels, dots, and lines.
  - Export a ZIP package with an installable generated TTF and notice files, not just a bitmap text effect.

Tests:

- Add Playwright assertions that these sections render below the working app.
- Check mobile layout and horizontal overflow.
- Keep `npm run test:launch` as the full layout gate.

## Phase 4 - LLM Files And Content Sync

Goal: make machine-readable product context richer without letting it drift.

Implement:

- Add `public/llms-full.txt` with fuller factual context:
  - product description;
  - current export boundaries;
  - privacy behavior;
  - bundled demo-font families;
  - license caveats;
  - links to app, repo, docs, and source licenses.
- Keep `public/llms.txt` concise and link to `llms-full.txt`.
- Add a verify script that checks the bundled font family list in LLM files against the actual vendored font set or a shared source list.

Tests:

- Extend existing `/llms.txt` Playwright coverage to include `/llms-full.txt`.
- Add the font-list drift check to `npm run verify`.

## Phase 5 - Long-Tail Pages

Goal: grow beyond one URL without creating thin pages.

Start small:

- `/how-to-make-a-pixel-font/`
- `/convert-ttf-to-pixel-font/`
- one or two example pages, such as `/pixel-merriweather/` and `/pixel-inter/`

Each page needs:

- unique title and meta description;
- one real generated preview image;
- one short explanation of the source font and pixel effect;
- license notes;
- a clear link back to the tool;
- inclusion in sitemap.

Technical notes:

- Use Vite multi-page build only after Phase 1-4 are stable.
- Extract shared metadata/schema helpers before adding several pages.
- Consider app query-param presets later so pages can link into the tool with a selected font/effect.

## Phase 6 - Distribution Signals

Do after indexation and page quality are fixed:

- Product Hunt
- Show HN
- AlternativeTo / design-tool directories
- selected Reddit communities with useful context, not drive-by posting
- GitHub topics and README polish

Launch assets:

- one short screen recording;
- one before/after image;
- three generated pixel font examples;
- one honest limitations line: Basic Latin MVP, source font license still applies.

## Recommended First Dev Pass

Do Phase 1 only.

Why:

- It fixes the largest confirmed crawler gap.
- It is low-risk and fully testable.
- It does not require hosting account access.
- It creates a better base for later content and long-tail pages.

Open decisions before implementation:

- Is pixelplease permanently free, or free only during MVP?
- Is there hosting/CDN access to verify AI crawler behavior and `www` redirects?
- Should first long-tail pages be general guides or bundled-font example pages?
- Should generated preview images be committed as static assets or generated later in a build pipeline?

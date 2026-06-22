# pixelplease SEO proposal

## SEO Positioning

Primary category:

> Browser-based pixel font generator.

Core message:

> pixelplease turns a source font into a pixel-style test TTF directly in the browser. Upload a font or start from a bundled permissive demo font, tune the pixel effect, preview the result, and export a package.

## Keyword Clusters

Primary:

- pixel font generator
- pixel font maker
- pixelated font generator
- font pixelizer

Secondary:

- convert font to pixel font
- TTF pixel font generator
- browser font generator
- retro font generator
- pixel typography tool

Long-tail:

- upload font and make pixel font
- turn Google Font into pixel font
- generate pixel TTF from font
- make retro pixel font from existing font

## Recommended Page Title

Best default:

```text
pixelplease - pixel font generator
```

Alternates:

```text
pixelplease - make pixel fonts in your browser
pixel font generator for TTF exports - pixelplease
```

## Meta Description

Current implementation:

```text
Upload a font, pixelize its glyphs in your browser, preview the result, and export a test TTF package. No server upload.
```

Shorter alternate:

```text
Turn a font into a pixel-style test TTF in your browser. Upload a font, tune the pixel effect, preview, and export a ZIP package.
```

## First Page Structure

Keep the tool as the first screen. Add lightweight SEO content below the working app, not above it:

1. H1: `pixelplease`
2. One-sentence product copy.
3. The app.
4. Below-app section: "How it works"
5. Below-app section: "What you can export"
6. Below-app FAQ

Suggested FAQ:

- Do uploaded fonts leave my browser?
- Can I use any font?
- What formats does pixelplease export?
- Why is the export called a test font?
- What glyphs are supported today?

## Technical SEO Tasks

Done now:

- Descriptive static `<title>`.
- Meta description.
- `robots` directive.
- Open Graph and Twitter summary tags.
- Client-side privacy is reflected in copy.
- Favicon and app icon assets.
- Canonical URL and `og:url` for `https://pixelplease.tools/`.
- `robots.txt` and `sitemap.xml`.
- SoftwareApplication structured data.
- Root `/llms.txt` file for LLM-friendly product context.

Add after final domain:

- Social preview image.
- Search Console property.

## AI Discovery

`/llms.txt` is included as a concise Markdown context file for AI retrieval systems and LLM agents. It should stay factual and compact:

- what pixelplease is;
- what it exports today;
- local-only upload/privacy behavior;
- licensing caveats for generated derivative fonts;
- links to the app, repo, product brief, workflow, SEO proposal, release checklist, and bundled source license files.

This complements `robots.txt` and `sitemap.xml`; it does not replace crawler access control.

## Structured Data

Current implementation:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "pixelplease",
  "applicationCategory": "DesignApplication",
  "operatingSystem": "Web",
  "description": "A browser-based pixel font generator for previewing and exporting test TTF packages.",
  "url": "https://pixelplease.tools/"
}
</script>
```

Do not add ratings, prices, or claims that are not visible on the page.

## Domain Recommendation

Best options:

- `pixelplease.app`: most direct for a usable web tool.
- `pixelplease.design`: good for designer audience and typography positioning.
- `pixelplease.studio`: more brand/editorial, less utility.

Skip `.type`: it is not a current public TLD.

## Sources

- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google title link best practices: https://developers.google.com/search/docs/appearance/title-link
- Google SoftwareApplication structured data: https://developers.google.com/search/docs/appearance/structured-data/software-app
- Google Search Console: https://search.google.com/search-console/about
- llms.txt proposal: https://llmstxt.org/

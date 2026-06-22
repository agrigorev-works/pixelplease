# pixelplease SEO proposal

## SEO Positioning

Primary category:

> Fastest way to create a custom pixel font.

Core message:

> pixelplease turns a source font into a usable pixel-style typeface directly in the browser. Upload a font or start from a bundled permissive demo font, tune the pixel effect, preview the result, and export an installable TTF package instead of a static image effect.

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
- installable pixel font

Long-tail:

- upload font and make pixel font
- turn Google Font into pixel font
- generate pixel TTF from font
- make retro pixel font from existing font
- make a usable pixel font for posters and interfaces

## Recommended Page Title

Best default:

```text
pixelplease - fastest way to create a custom pixel font
```

Alternates:

```text
pixelplease - pixel font generator
pixelplease - make pixel fonts in your browser
pixel font generator for TTF exports - pixelplease
```

## Meta Description

Current implementation:

```text
Create a pixel-style font from a regular typeface. Upload your own font or start with a Google font, tune the effect, and export as a .ttf
```

Shorter alternate:

```text
Turn a font into a usable pixel-style typeface in your browser. Upload a font, tune the effect, preview, and export an installable TTF package.
```

## First Page Structure

Keep the tool as the first screen. Add lightweight SEO content below the working app, not above it:

1. H1: `pixelplease`
2. One-sentence product copy.
3. The app.
4. Below-app section: "How it works"
5. Below-app section: "What you can export"
6. Below-app FAQ

Implemented FAQ topics:

- What is the fastest way to create a custom pixel font?
- How do I turn a regular font into a pixel font?
- Can I start from a Google font?
- Can I upload my own TTF or OTF font?
- Where does pixelplease process my font?
- How do I export and install the pixel font?
- What do the grid, threshold, expand, and shift controls do?
- Does pixelplease work with any font?
- Can I use the exported pixel font commercially?
- What does the OFL / SIL Open Font License mean here?

## Technical SEO Tasks

Done now:

- Descriptive static `<title>`.
- Meta description.
- `robots` directive.
- Open Graph and Twitter card tags.
- Client-side privacy is reflected in copy.
- Favicon and app icon assets.
- Social preview image at `https://pixelplease.tools/og-image.png`.
- Canonical URL and `og:url` for `https://pixelplease.tools/`.
- `robots.txt` and `sitemap.xml`.
- SoftwareApplication structured data.
- Below-app FAQ section with matching `FAQPage` structured data.
- Root `/llms.txt` file for LLM-friendly product context.
- GA4 measurement `G-717BB12JJ8`, loaded only on `pixelplease.tools` and `www.pixelplease.tools`.

Add after final domain:

- Search Console property.

Analytics note:

- GA4 tracks the production pageview only.
- The app does not send uploaded font files, generated font data, or edited sample text to analytics.
- Local, LAN, Playwright, and temporary `ondigitalocean.app` hosts do not load the Google tag.

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
  "description": "Create a pixel-style font from a regular typeface. Upload your own font or start with a Google font, tune the effect, and export as a .ttf",
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

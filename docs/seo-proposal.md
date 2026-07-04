# pixelplease SEO proposal

## SEO Positioning

Primary category:

> Fastest way to create a custom pixel font.

Core message:

> pixelplease turns a source font into a usable pixel-style typeface directly in the browser. Upload a font or start from a bundled permissive demo font, tune the pixel effect, preview the result, and export an installable TTF package instead of a static image effect.

## Keyword Clusters

Primary:

- pixel font generator
- create pixel font
- pixel font maker
- pixelated font generator
- font pixelizer

Secondary:

- download pixel font
- convert font to pixel font
- TTF pixel font generator
- browser font generator
- retro font generator
- pixel typography tool
- installable pixel font

Long-tail:

- how to create pixel font
- upload font and make pixel font
- turn Google Font into pixel font
- generate pixel TTF from font
- make retro pixel font from existing font
- make a usable pixel font for posters and interfaces

## Recommended Page Title

Best default:

```text
Free Pixel Font Generator - Convert a Basic Font to a Pixel TTF | pixelplease
```

Alternates:

```text
pixelplease - pixel font generator
pixelplease - make pixel fonts in your browser
pixel font generator for TTF exports - pixelplease
How to Make a Pixel Font in Your Browser | pixelplease
Convert TTF or OTF to a Pixel Font | pixelplease
```

## Meta Description

Current implementation:

```text
Free pixel font generator for turning a basic TTF, OTF, or bundled Google Font into a downloadable pixel-style TTF in your browser. No signup, no server upload, tune effects and download your pixel font.
```

Shorter alternate:

```text
Turn a basic font into a usable pixel-style typeface in your browser. Upload a font, tune effects, preview, and download an installable generated TTF package.
```

## First Page Structure

Keep the tool as the first screen. Add lightweight SEO content below the working app, not above it:

1. H1: `pixelplease`
2. One-sentence product copy.
3. The app.
4. Compact below-app section: "Make a usable pixel font"
5. Below-app FAQ

Implemented FAQ topics:

- What is the fastest way to create a custom pixel font?
- Are my uploaded fonts and data private?
- How do I turn a regular font into a pixel font?
- Can I start from a Google font?
- Can I upload my own TTF or OTF font?
- How do I download and install the pixel font?
- What do the grid, threshold, expand, and shift controls do?
- What source fonts work best?
- Can I use the generated pixel font commercially?
- What does the OFL / SIL Open Font License mean here?

## Technical SEO Tasks

Done now:

- Descriptive static `<title>`.
- Meta description.
- Static H1 and intro copy in `index.html` for non-JS and LLM crawlers.
- `robots` directive.
- Open Graph and Twitter card tags.
- Client-side privacy is reflected in visible copy: no registration/login, no uploaded font storage, no font/sample/output analytics.
- Favicon and app icon assets.
- Social preview image at `https://pixelplease.tools/og-image-20260623.png`.
- Canonical URL and `og:url` for `https://pixelplease.tools/`.
- `robots.txt` and `sitemap.xml`.
- SoftwareApplication structured data.
- SoftwareApplication `offers`, `featureList`, and screenshot fields.
- Compact below-app `Make a usable pixel font` section covering workflow, tuning, and TTF export.
- Below-app FAQ section with matching `FAQPage` structured data.
- Root `/llms.txt` file for LLM-friendly product context.
- Root `/llms-full.txt` file for expanded LLM-friendly product context.
- Sitemap generation script with current `lastmod` values and long-tail static pages.
- Static long-tail pages for `how to make a pixel font`, `convert TTF to pixel font`, `Pixel Merriweather`, and `Pixel Inter`.
- GA4 measurement `G-717BB12JJ8`, loaded only on the production root domain and defensively allowed on `www.pixelplease.tools`, with pageview analytics allowed and ad signals denied.

Add after final domain:

- Search Console property.

Analytics note:

- GA4 tracks the production pageview only.
- The app does not send uploaded font files, generated font data, or edited sample text to analytics.
- GA consent defaults explicitly grant `analytics_storage` and deny `ad_storage`, `ad_user_data`, and `ad_personalization`.
- Uploaded fonts are read in the browser for the current session; pixelplease has no backend upload or font-storage step.
- Local, LAN, Playwright, and temporary `ondigitalocean.app` hosts do not load the Google tag.

## AI Discovery

`/llms.txt` is included as a concise Markdown context file for AI retrieval systems and LLM agents. It should stay factual and compact:

- what pixelplease is;
- what it exports today;
- local-only upload/privacy behavior, including no account requirement and no font-storage step;
- MIT code license, separate from bundled font licenses;
- licensing caveats for generated derivative fonts;
- links to the app, repo, product brief, workflow guide, SEO proposal, release checklist, and bundled source license files.

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
  "description": "Free pixel font generator for turning a basic TTF, OTF, or bundled Google Font into a downloadable pixel-style TTF in your browser. No signup, no server upload, tune effects and download your pixel font.",
  "url": "https://pixelplease.tools/",
  "image": "https://pixelplease.tools/icons/icon-1024.png",
  "thumbnailUrl": "https://pixelplease.tools/icons/icon-1024.png",
  "logo": "https://pixelplease.tools/icons/icon-1024.png",
  "screenshot": "https://pixelplease.tools/og-image-20260623.png",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "Convert a basic TTF, OTF, or bundled Google Font into a generated pixel-style TTF package",
    "Tune pixel grid, threshold, weight expansion, shift, and effects for pixels, dots, and lines",
    "Preview generated pixel font output in the browser",
    "Download a ZIP package with a generated TTF and notice files",
    "Process uploaded fonts locally in the browser without server upload"
  ]
}
</script>
```

Do not add ratings or claims that are not visible on the page. Price `0` is allowed only while the visible page also says pixelplease is free.

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

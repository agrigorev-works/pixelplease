import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import opentype from "opentype.js";
import { UI_COPY } from "../src/interface-copy";
import { createFixtureFont } from "./fixture-font";

const artifactsDir = path.resolve("test-artifacts");
const sourcePath = path.join(artifactsDir, "fixture-source.ttf");
const generatedPackagePath = path.join(artifactsDir, "generated-pixel.zip");
const googleGeneratedPackagePath = path.join(artifactsDir, "google-generated-pixel.zip");
const googleItalicGeneratedPackagePath = path.join(artifactsDir, "google-italic-generated-pixel.zip");
const latoSourcePath = path.resolve("samples/Lato-Regular.ttf");
const latoGeneratedPackagePath = path.join(artifactsDir, "lato-generated-pixel.zip");

test.beforeAll(async () => {
  await fs.mkdir(artifactsDir, { recursive: true });
  const fixture = createFixtureFont();
  await fs.writeFile(sourcePath, Buffer.from(fixture.toArrayBuffer()));
});

test("shows a centered creator credit using the FAQ subtitle typography", async ({ page }) => {
  await page.goto("/");

  const link = page.locator(".creator-link");
  await expect(link).toHaveText(UI_COPY.credit.label);
  await expect(link).toHaveAttribute("href", UI_COPY.credit.href);

  const metrics = await page.evaluate(() => {
    const link = document.querySelector(".creator-link");
    const faqSubtitle = document.querySelector(".footer-copy");
    if (!link || !faqSubtitle) {
      throw new Error("Missing creator credit or FAQ subtitle");
    }
    const linkBox = link.getBoundingClientRect();
    const linkStyles = getComputedStyle(link);
    const subtitleStyles = getComputedStyle(faqSubtitle);
    return {
      centerDelta: Math.abs(linkBox.left + linkBox.width / 2 - window.innerWidth / 2),
      fontSize: linkStyles.fontSize,
      lineHeight: linkStyles.lineHeight,
      color: linkStyles.color,
      subtitleFontSize: subtitleStyles.fontSize,
      subtitleLineHeight: subtitleStyles.lineHeight,
      subtitleColor: subtitleStyles.color,
      textDecorationLine: linkStyles.textDecorationLine,
    };
  });

  expect(metrics.centerDelta).toBeLessThan(1);
  expect(metrics.fontSize).toBe(metrics.subtitleFontSize);
  expect(metrics.lineHeight).toBe(metrics.subtitleLineHeight);
  expect(metrics.color).toBe(metrics.subtitleColor);
  expect(metrics.textDecorationLine).toContain("underline");
});

test("serves an LLM discovery file from the site root", async ({ page }) => {
  const response = await page.request.get("/llms.txt");

  expect(response.ok()).toBe(true);

  const body = await response.text();
  expect(body).toContain("# pixelplease");
  expect(body).toContain("free pixel font generator");
  expect(body).toContain("browser-based pixel font generator");
  expect(body).toContain("downloadable pixel-style TTF packages");
  expect(body).toContain("Uploaded fonts are read locally in the browser");
  expect(body).toContain("Generated font family names start with product-owned `PixelPlease`");
  expect(body).toContain("[Full LLM context](https://pixelplease.tools/llms-full.txt)");
  expect(body).toContain("https://pixelplease.tools/how-to-make-a-pixel-font/");
  expect(body).toContain("blob/main/docs/product-brief.md");
  expect(body).toContain("Generated fonts are derivative pixel-style fonts");
  expect(body).not.toContain("pixelplease-Font");
  expect(body).not.toContain("variation-light-terminal-ui");
  expect(body).toContain("## Product");
  expect(body).toContain("## Reference");
  expect(body).toContain("## Licensing");
  expect(body).toContain("[llms.txt proposal](https://llmstxt.org/)");
  expect(body).not.toContain("Bebas Neue");
});

test("serves expanded LLM context", async ({ page }) => {
  const response = await page.request.get("/llms-full.txt");

  expect(response.ok()).toBe(true);

  const body = await response.text();
  expect(body).toContain("# pixelplease full LLM context");
  expect(body).toContain("notice files");
  expect(body).toContain("Uploaded fonts are read locally in the browser");
  expect(body).toContain("Alan Sans");
  expect(body).toContain("Bebas Neue");
  expect(body).toContain("Inter");
  expect(body).toContain("Merriweather");
  expect(body).toContain("Space Grotesk");
  expect(body).toContain("Avoid describing pixelplease as");
  expect(body).toContain("https://pixelplease.tools/pixel-inter/");
});

test("serves static SEO landing pages", async ({ page }) => {
  const pages = [
    {
      path: "/how-to-make-a-pixel-font/",
      title: "How to Make a Pixel Font in Your Browser | pixelplease",
      heading: "How to make a pixel font",
      body: "download the ZIP package",
    },
    {
      path: "/convert-ttf-to-pixel-font/",
      title: "Convert TTF or OTF to a Pixel Font | pixelplease",
      heading: "Convert TTF to pixel font",
      body: "Font parsing and generated font creation happen in the browser.",
    },
    {
      path: "/pixel-merriweather/",
      title: "Pixel Merriweather Font Example | pixelplease",
      heading: "Pixel Merriweather",
      body: "Merriweather is the default bundled demo font in pixelplease.",
    },
    {
      path: "/pixel-inter/",
      title: "Pixel Inter Font Example | pixelplease",
      heading: "Pixel Inter",
      body: "Inter is a clean sans-serif source for generated pixel-style TTF experiments.",
    },
  ];

  for (const staticPage of pages) {
    const response = await page.request.get(staticPage.path);
    expect(response.ok(), staticPage.path).toBe(true);
    const body = await response.text();
    expect(body).toContain(`<title>${staticPage.title}</title>`);
    expect(body).toContain(staticPage.heading);
    expect(body).toContain(staticPage.body);
    expect(body).toContain('<a href="/">pixelplease</a>');
  }
});

test("serves favicon and app icon assets", async ({ page }) => {
  const iconPaths = [
    "/favicon.ico",
    "/icons/favicon-16.png",
    "/icons/favicon-32.png",
    "/icons/favicon-48.png",
    "/apple-touch-icon.png",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/icon-1024.png",
    "/site.webmanifest",
  ];

  for (const iconPath of iconPaths) {
    const response = await page.request.get(iconPath);
    expect(response.ok(), iconPath).toBe(true);
  }

  await page.goto("/");
  await expect(page.locator('link[rel="icon"][href="/favicon.ico"]')).toHaveCount(1);
  await expect(page.locator('link[rel="icon"][href="/icons/icon-1024.png"]')).toHaveAttribute("sizes", "1024x1024");
  await expect(page.locator('link[rel="apple-touch-icon"][href="/apple-touch-icon.png"]')).toHaveCount(1);
  await expect(page.locator('link[rel="manifest"][href="/site.webmanifest"]')).toHaveCount(1);

  const manifest = await (await page.request.get("/site.webmanifest")).json();
  expect(manifest.name).toBe("pixelplease");
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: "/icons/icon-192.png", sizes: "192x192" }),
      expect.objectContaining({ src: "/icons/icon-512.png", sizes: "512x512" }),
      expect.objectContaining({ src: "/icons/icon-1024.png", sizes: "1024x1024" }),
    ]),
  );
});

test("serves expanded bundled Google Font assets", async ({ page }) => {
  const weights100To900 = [
    "Thin",
    "ExtraLight",
    "Light",
    "Regular",
    "Medium",
    "SemiBold",
    "Bold",
    "ExtraBold",
    "Black",
  ];
  const weightedFonts: Array<{ dir: string; prefix: string; weights: string[]; hasItalic: boolean }> = [
    { dir: "alansans", prefix: "AlanSans", weights: weights100To900.slice(2), hasItalic: false },
    { dir: "ibmplexsans", prefix: "IBMPlexSans", weights: weights100To900.slice(0, 7), hasItalic: true },
    { dir: "lato", prefix: "Lato", weights: weights100To900, hasItalic: true },
    { dir: "librebaskerville", prefix: "LibreBaskerville", weights: ["Regular", "Medium", "SemiBold", "Bold"], hasItalic: true },
    { dir: "merriweather", prefix: "Merriweather", weights: weights100To900.slice(2), hasItalic: true },
    { dir: "robotomono", prefix: "RobotoMono", weights: weights100To900.slice(0, 7), hasItalic: true },
    { dir: "spacegrotesk", prefix: "SpaceGrotesk", weights: ["Light", "Regular", "Medium", "Bold"], hasItalic: false },
    { dir: "inter", prefix: "Inter", weights: weights100To900, hasItalic: true },
    { dir: "instrumentsans", prefix: "InstrumentSans", weights: ["Regular", "Medium", "SemiBold", "Bold"], hasItalic: true },
    { dir: "montserrat", prefix: "Montserrat", weights: weights100To900, hasItalic: true },
    { dir: "fraunces", prefix: "Fraunces", weights: weights100To900, hasItalic: true },
    { dir: "playfairdisplay", prefix: "PlayfairDisplay", weights: ["Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Black"], hasItalic: true },
    { dir: "geistmono", prefix: "GeistMono", weights: weights100To900, hasItalic: true },
  ];
  const assetPaths = [
    ...weightedFonts.flatMap(({ dir, prefix, weights }) =>
      weights.map((weight) => `/fonts/google/${dir}/${prefix}-${weight}.ttf`),
    ),
    ...weightedFonts.flatMap(({ dir, prefix, weights, hasItalic }) =>
      hasItalic ? weights.map((weight) => `/fonts/google/${dir}/${prefix}-${weight}Italic.ttf`) : [],
    ),
    "/fonts/google/bebasneue/BebasNeue-Regular.ttf",
    "/fonts/google/licenses/alansans-OFL.txt",
    "/fonts/google/licenses/inter-OFL.txt",
    "/fonts/google/licenses/instrumentsans-OFL.txt",
    "/fonts/google/licenses/montserrat-OFL.txt",
    "/fonts/google/licenses/bebasneue-OFL.txt",
    "/fonts/google/licenses/fraunces-OFL.txt",
    "/fonts/google/licenses/playfairdisplay-OFL.txt",
    "/fonts/google/licenses/geistmono-OFL.txt",
  ];

  for (const assetPath of assetPaths) {
    const response = await page.request.get(assetPath);
    expect(response.ok(), assetPath).toBe(true);
  }
});

test("serves final-domain SEO metadata and crawler files", async ({ page }) => {
  const robotsResponse = await page.request.get("/robots.txt");
  expect(robotsResponse.ok()).toBe(true);
  const robots = await robotsResponse.text();
  expect(robots).toContain("User-agent: *");
  expect(robots).toContain("Allow: /");
  expect(robots).toContain("Sitemap: https://pixelplease.tools/sitemap.xml");

  const sitemapResponse = await page.request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain("<loc>https://pixelplease.tools/</loc>");
  expect(sitemap).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  expect(sitemap).toContain("<loc>https://pixelplease.tools/how-to-make-a-pixel-font/</loc>");
  expect(sitemap).toContain("<loc>https://pixelplease.tools/convert-ttf-to-pixel-font/</loc>");
  expect(sitemap).toContain("<loc>https://pixelplease.tools/pixel-merriweather/</loc>");
  expect(sitemap).toContain("<loc>https://pixelplease.tools/pixel-inter/</loc>");

  const rootHtml = await (await page.request.get("/")).text();
  expect(rootHtml).toContain('<h1 id="logo-title" aria-label="pixel please"><span>pixel</span><span>please</span></h1>');
  expect(rootHtml).toContain("Free pixel font generator");
  expect(rootHtml).toContain("Make a usable pixel font");
  expect(rootHtml).toContain("Download an installable TTF");

  await page.goto("/");
  await expect(page).toHaveTitle(UI_COPY.documentTitle);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow, max-image-preview:large");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://pixelplease.tools/");
  await expect(page.locator('link[rel="preload"][href="/fonts/google/merriweather/Merriweather-var.ttf"]')).toHaveAttribute(
    "as",
    "font",
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", "https://pixelplease.tools/");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", UI_COPY.documentTitle);
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", UI_COPY.documentTitle);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://pixelplease.tools/og-image-20260623.png",
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    "https://pixelplease.tools/og-image-20260623.png",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", UI_COPY.intro.copy);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", UI_COPY.intro.copy);
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute("content", UI_COPY.intro.copy);

  const socialImageResponse = await page.request.get("/og-image-20260623.png");
  expect(socialImageResponse.ok()).toBe(true);
  expect(socialImageResponse.headers()["content-type"]).toContain("image/png");

  const structuredDataItems = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((item) =>
    JSON.parse(item),
  );
  const softwareApplication = structuredDataItems.find((item) => item["@type"] === "SoftwareApplication");
  const faqPage = structuredDataItems.find((item) => item["@type"] === "FAQPage");

  expect(softwareApplication).toMatchObject({
    description: UI_COPY.intro.copy,
    url: "https://pixelplease.tools/",
    image: "https://pixelplease.tools/icons/icon-1024.png",
    thumbnailUrl: "https://pixelplease.tools/icons/icon-1024.png",
    logo: "https://pixelplease.tools/icons/icon-1024.png",
    screenshot: "https://pixelplease.tools/og-image-20260623.png",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  });
  expect(softwareApplication?.featureList).toEqual(
    expect.arrayContaining([
      expect.stringContaining("Convert a basic TTF, OTF, or bundled Google Font"),
      expect.stringContaining("Process uploaded fonts locally in the browser"),
    ]),
  );
  expect(faqPage?.mainEntity).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "What is the fastest way to create a custom pixel font?" }),
      expect.objectContaining({ name: "Are my uploaded fonts and data private?" }),
      expect.objectContaining({ name: "Can I use the generated pixel font commercially?" }),
    ]),
  );
  expect(faqPage?.mainEntity?.[1]).toMatchObject({ name: "Are my uploaded fonts and data private?" });
  expect(JSON.stringify(faqPage)).toContain("usable pixel-style TTF");
  expect(JSON.stringify(faqPage)).toContain("not just a raster image effect");
  expect(JSON.stringify(faqPage)).toContain("no registration, login, or account is needed");
  expect(JSON.stringify(faqPage)).toContain("does not upload it, store it on a server");
  expect(JSON.stringify(faqPage)).toContain("generated TTF data to analytics");
  expect(JSON.stringify(faqPage)).toContain("download your pixel font package");
  expect(JSON.stringify(faqPage)).toContain("different pixel fonts can be installed side by side");
  expect(JSON.stringify(faqPage)).toContain("practical creative use");
});

test("renders the SEO FAQ below the working app", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Make a usable pixel font" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Start from a basic font" })).toBeVisible();
  await expect(page.getByText("custom pixel-style font")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tune pixels, dots, and lines" })).toBeVisible();
  await expect(page.getByText("square pixels, dots, vertical lines")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Download an installable TTF" })).toBeVisible();
  await expect(page.getByText("not just a bitmap text effect")).toBeVisible();

  await page.locator(".faq-section").scrollIntoViewIfNeeded();

  await expect(page.getByRole("heading", { name: "FAQ" })).toBeVisible();
  await expect(page.locator("#logo-title")).toHaveAttribute("data-logo-font", "ready", { timeout: 20_000 });
  await expect(page.locator(".faq-item")).toHaveCount(10);
  await expect(page.getByRole("heading", { name: "What is the fastest way to create a custom pixel font?" })).toBeVisible();
  await expect(page.locator(".faq-toggle")).toHaveCount(10);
  await expect(page.locator(".faq-item[open]")).toHaveCount(0);
  await expect(page.locator(".faq-item").first().locator("p")).toBeHidden();
  await expect(page.locator(".faq-section .footer-copy")).toHaveText(UI_COPY.footer.lines.join("\n"));

  const closedMetrics = await page.locator(".faq-item").first().evaluate((item) => {
    const summary = item.querySelector("summary");
    const heading = item.querySelector("h3");
    const toggle = item.querySelector(".faq-toggle");
    if (!summary || !heading || !toggle) {
      throw new Error("Missing FAQ controls");
    }

    const summaryBox = summary.getBoundingClientRect();
    const headingBox = heading.getBoundingClientRect();
    const toggleBox = toggle.getBoundingClientRect();
    const toggleStyles = getComputedStyle(toggle);

    return {
      summaryHeight: summaryBox.height,
      headingTopDelta: headingBox.top - summaryBox.top,
      headingLeftDelta: headingBox.left - summaryBox.left,
      toggleTopDelta: toggleBox.top - summaryBox.top,
      toggleRightDelta: summaryBox.right - toggleBox.right,
      toggleBorderWidth: toggleStyles.borderWidth,
      toggleBorderRadius: toggleStyles.borderRadius,
    };
  });

  await page.locator(".faq-item").first().locator("summary").click();
  await expect(page.locator(".faq-item").first()).toHaveAttribute("open", "");
  await expect(page.locator(".faq-item").first().locator("p")).toContainText("browser-based pixel font generator");
  await expect(page.locator(".faq-item").first().locator("p")).toContainText("usable pixel-style TTF");
  await expect(page.locator(".faq-item").first().locator("p")).toContainText("not just a raster image effect");
  await expect(page.locator(".faq-item").first().locator("p")).toBeVisible();
  const openMetrics = await page.locator(".faq-item").first().evaluate((item) => {
    const summary = item.querySelector("summary");
    const heading = item.querySelector("h3");
    const answer = item.querySelector("p");
    const toggle = item.querySelector(".faq-toggle");
    if (!summary || !heading || !answer || !toggle) {
      throw new Error("Missing FAQ expanded state");
    }

    const summaryBox = summary.getBoundingClientRect();
    const headingBox = heading.getBoundingClientRect();
    const answerBox = answer.getBoundingClientRect();
    const itemBox = item.getBoundingClientRect();
    const toggleBox = toggle.getBoundingClientRect();
    const answerStyles = getComputedStyle(answer);

    return {
      summaryHeight: summaryBox.height,
      headingTopDelta: headingBox.top - summaryBox.top,
      headingLeftDelta: headingBox.left - summaryBox.left,
      answerLeft: answerBox.left,
      answerRight: answerBox.right,
      itemLeft: itemBox.left,
      itemRight: itemBox.right,
      toggleTopDelta: toggleBox.top - summaryBox.top,
      toggleRightDelta: summaryBox.right - toggleBox.right,
      answerPaddingLeft: answerStyles.paddingLeft,
      answerPaddingRight: answerStyles.paddingRight,
    };
  });

  await page.locator(".faq-item").first().locator("summary").click();
  await expect(page.locator(".faq-item[open]")).toHaveCount(0);
  await expect(page.locator(".faq-item").first().locator("p")).toBeHidden();

  const privacyFaqItem = page.locator(".faq-item").filter({ hasText: "Are my uploaded fonts and data private?" });
  await expect(page.locator(".faq-item").nth(1)).toContainText("Are my uploaded fonts and data private?");
  await privacyFaqItem.locator("summary").click();
  await expect(privacyFaqItem).toHaveAttribute(
    "open",
    "",
  );
  await expect(privacyFaqItem.locator("p")).toContainText("no registration, login, or account is needed");
  await expect(privacyFaqItem.locator("p")).toContainText("does not upload it, store it on a server");
  await expect(privacyFaqItem.locator("p")).toContainText("generated TTF data to analytics");
  await page
    .locator(".faq-item")
    .filter({ hasText: "How do I download and install the pixel font?" })
    .locator("summary")
    .click();
  await expect(page.getByText("PixelPlease, a compact source code, effect recipe")).toBeVisible();
  await expect(page.getByText("installed side by side instead of overwriting each other")).toBeVisible();
  await expect(page.getByText("design tools, interface mockups, posters")).toBeVisible();

  const faqMetrics = await page.locator(".faq-section").evaluate((section) => {
    const workspace = document.querySelector(".workspace");
    const heading = document.querySelector("#faq-heading");
    const footer = section.querySelector(".site-footer");
    const list = section.querySelector(".faq-list");
    if (!workspace || !heading || !footer || !list) {
      throw new Error("Missing FAQ layout elements");
    }

    const sectionBox = section.getBoundingClientRect();
    const workspaceBox = workspace.getBoundingClientRect();
    const headingBox = heading.getBoundingClientRect();
    const footerBox = footer.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    const sectionStyles = getComputedStyle(section);
    const headingStyles = getComputedStyle(heading);
    const footerCopy = section.querySelector(".footer-copy");
    if (!footerCopy) {
      throw new Error("Missing FAQ footer copy");
    }
    const footerRange = document.createRange();
    footerRange.selectNodeContents(footerCopy);
    const footerLineCount = new Set(
      Array.from(footerRange.getClientRects()).map((rect) => Math.round(rect.top)),
    ).size;
    footerRange.detach();

    return {
      faqTop: sectionBox.top,
      workspaceTop: workspaceBox.top,
      borderTopWidth: sectionStyles.borderTopWidth,
      headingCenterDelta: Math.abs(headingBox.left + headingBox.width / 2 - (sectionBox.left + sectionBox.width / 2)),
      headingFontFamily: headingStyles.fontFamily,
      footerBelowHeading: footerBox.top > headingBox.bottom,
      footerAboveList: footerBox.bottom < listBox.top,
      footerLineCount,
    };
  });

  expect(closedMetrics.toggleBorderWidth).toBe("0px");
  expect(closedMetrics.toggleBorderRadius).toBe("0px");
  expect(Math.abs(openMetrics.summaryHeight - closedMetrics.summaryHeight)).toBeLessThan(1);
  expect(Math.abs(openMetrics.headingTopDelta - closedMetrics.headingTopDelta)).toBeLessThan(1);
  expect(Math.abs(openMetrics.headingLeftDelta - closedMetrics.headingLeftDelta)).toBeLessThan(1);
  expect(Math.abs(openMetrics.toggleTopDelta - closedMetrics.toggleTopDelta)).toBeLessThan(1);
  expect(Math.abs(openMetrics.toggleRightDelta - closedMetrics.toggleRightDelta)).toBeLessThan(1);
  expect(openMetrics.answerPaddingLeft).toBe("16px");
  expect(openMetrics.answerPaddingRight).toBe("16px");
  expect(Math.abs(openMetrics.answerLeft - openMetrics.itemLeft)).toBeLessThan(1);
  expect(Math.abs(openMetrics.answerRight - openMetrics.itemRight)).toBeLessThan(1);
  expect(faqMetrics.faqTop).toBeGreaterThan(faqMetrics.workspaceTop);
  expect(faqMetrics.borderTopWidth).toBe("0px");
  expect(faqMetrics.headingCenterDelta).toBeLessThan(1);
  expect(faqMetrics.headingFontFamily).toContain("PixelpleaseLogoFont");
  expect(faqMetrics.footerBelowHeading).toBe(true);
  expect(faqMetrics.footerAboveList).toBe(true);
  expect(faqMetrics.footerLineCount).toBe(UI_COPY.footer.lines.length);
});

test("does not load Google Analytics on local preview hosts", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
  const dataLayer = await page.evaluate(() => window.dataLayer);
  expect(dataLayer).toBeUndefined();
});

test("adds light desktop hover feedback to interactive controls", async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.goto("/");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  const fontSelectTrigger = page.locator("#google-font-field .custom-select-trigger");
  await fontSelectTrigger.hover();
  await expect(fontSelectTrigger).toHaveCSS("border-color", "rgb(17, 17, 17)");
  await expect(fontSelectTrigger).toHaveCSS("outline-color", "rgb(17, 17, 17)");
  await expect(fontSelectTrigger).toHaveCSS("cursor", /none/);
  await expect(page.locator(".custom-cursor")).toHaveAttribute("data-cursor-shape", "pointer");

  await fontSelectTrigger.click();
  await expect(fontSelectTrigger).toHaveAttribute("aria-expanded", "true");
  const fontOption = page.locator("#google-font-field .custom-select-option").nth(1);
  await fontOption.hover();
  await expect(fontOption).toHaveCSS("cursor", /none/);
  await expect(page.locator(".custom-cursor")).toHaveAttribute("data-cursor-shape", "pointer");
  const selectedFontValue = await fontOption.getAttribute("data-value");
  await fontOption.click();
  await expect(page.locator("#google-font-select")).toHaveValue(selectedFontValue ?? "");
  await expect(fontSelectTrigger).toHaveAttribute("aria-expanded", "false");

  await page.locator(".segment-option").nth(1).hover();
  await expect(page.locator(".segment-option").nth(1)).toHaveCSS("background-color", "rgb(245, 245, 245)");

  await page.locator(".field").first().hover();
  await expect(page.locator(".field").first().locator("span")).toHaveCSS("color", "rgb(17, 17, 17)");
  await expect(page.locator("#pixels-per-em")).toHaveCSS("cursor", /none/);

  await page.locator("#pixels-per-em").fill("21");
  await expect(page.getByRole("button", { name: UI_COPY.controls.resetDefaults })).toBeEnabled();
  await page.getByRole("button", { name: UI_COPY.controls.resetDefaults }).hover();
  await expect(page.getByRole("button", { name: UI_COPY.controls.resetDefaults })).toHaveCSS(
    "background-color",
    "rgb(245, 245, 245)",
  );

  await page.locator("#download-link").hover();
  await expect(page.locator("#download-link")).toHaveCSS("outline-style", "solid");

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await expect(page.locator("#upload-zone")).toBeVisible();
  await page.locator("#upload-zone").hover();
  await expect(page.locator("#upload-zone")).toHaveCSS("background-color", "rgb(245, 245, 245)");

  await page.locator(".faq-item").first().locator("summary").hover();
  await expect(page.locator(".faq-item").first().locator("summary")).toHaveCSS(
    "background-color",
    "rgb(245, 245, 245)",
  );
  await expect(page.locator(".faq-item").first().locator("summary")).toHaveCSS("cursor", /none/);
  await expect(page.locator(".custom-cursor")).toHaveAttribute("data-cursor-shape", "pointer");

  const selectionStyles = await page.evaluate(() => {
    const introSelection = getComputedStyle(document.querySelector(".intro-copy") as Element, "::selection");
    const sourceSelection = getComputedStyle(document.querySelector("#sample-text") as Element, "::selection");
    return {
      introBackground: introSelection.backgroundColor,
      introColor: introSelection.color,
      sourceBackground: sourceSelection.backgroundColor,
      sourceColor: sourceSelection.color,
    };
  });
  expect(selectionStyles).toEqual({
    introBackground: "rgb(214, 255, 0)",
    introColor: "rgb(17, 17, 17)",
    sourceBackground: "rgb(214, 255, 0)",
    sourceColor: "rgb(17, 17, 17)",
  });
});

test("adds an experimental large cursor and click pixel burst", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("body")).toHaveCSS("cursor", /none/);
  await expect(page.locator("#download-link")).toHaveCSS("cursor", /none/);
  await expect(page.locator(".custom-cursor")).toHaveCSS("pointer-events", "none");
  await expect(page.locator(".custom-cursor")).toHaveCSS("position", "fixed");

  await page.mouse.move(96, 96);
  await expect(page.locator(".custom-cursor")).toHaveClass(/is-visible/);
  await expect(page.locator(".custom-cursor")).toHaveAttribute("data-cursor-shape", "arrow");

  await page.locator("#download-link").hover();
  await expect(page.locator(".custom-cursor")).toHaveAttribute("data-cursor-shape", "pointer");

  const layerMetrics = await page.locator(".click-pixel-layer").evaluate((layer) => {
    const styles = getComputedStyle(layer);
    return {
      pointerEvents: styles.pointerEvents,
      position: styles.position,
      inset: `${styles.top} ${styles.right} ${styles.bottom} ${styles.left}`,
    };
  });
  expect(layerMetrics).toEqual({
    pointerEvents: "none",
    position: "fixed",
    inset: "0px 0px 0px 0px",
  });

  await page.mouse.move(120, 120);
  for (let step = 1; step <= 5; step += 1) {
    await page.mouse.move(120 + step * 18, 120 + step * 6);
    await page.waitForTimeout(45);
  }

  await expect
    .poll(async () => page.locator(".cursor-trail-pixel").count(), { timeout: 1_000 })
    .toBeGreaterThan(2);

  const trailColors = await page.locator(".cursor-trail-pixel").evaluateAll((pixels) =>
    pixels.map((pixel) => getComputedStyle(pixel).backgroundColor),
  );
  expect(trailColors).toContain("rgb(17, 17, 17)");
  expect(trailColors).toContain("rgb(255, 255, 255)");

  await expect(page.locator(".cursor-trail-pixel")).toHaveCount(0, { timeout: 1_500 });
  await page.waitForTimeout(160);
  await expect(page.locator(".cursor-trail-pixel")).toHaveCount(0);

  await page.mouse.click(96, 96);

  await expect
    .poll(async () => page.locator(".click-pixel").count(), { timeout: 1_000 })
    .toBeGreaterThan(8);

  const colors = await page.locator(".click-pixel").evaluateAll((pixels) =>
    pixels.map((pixel) => getComputedStyle(pixel).backgroundColor),
  );
  expect(colors).toContain("rgb(17, 17, 17)");
  expect(colors).toContain("rgb(255, 255, 255)");

  await expect(page.locator(".click-pixel")).toHaveCount(0, { timeout: 2_000 });

  await page.mouse.move(128, 128);
  await page.mouse.down();
  await page.waitForTimeout(360);
  await page.mouse.up();
  await page.waitForTimeout(120);
  await expect(page.locator(".click-pixel")).toHaveCount(0);

  const introBox = await page.locator(".intro-copy").boundingBox();
  expect(introBox).not.toBeNull();
  await page.mouse.move(introBox!.x + 12, introBox!.y + introBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(introBox!.x + Math.min(introBox!.width - 12, 240), introBox!.y + introBox!.height / 2, {
    steps: 6,
  });
  await page.mouse.up();
  await page.waitForTimeout(120);
  await expect(page.locator(".click-pixel")).toHaveCount(0);
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
});

test("uses the available desktop viewport instead of a fixed narrow shell", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/");

  const shellBox = await page.locator(".app-shell").boundingBox();

  expect(shellBox?.width).toBeGreaterThan(1200);
});

test("renders a clean three-column source output settings layout", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.locator(".terminal-bar")).toHaveCount(0);
  await expect(page.getByText("pixelplease.local")).toHaveCount(0);
  await expect(page.locator(".prompt-line")).toHaveCount(0);
  await expect(page.getByText("font-to-pixel --local")).toHaveCount(0);
  await expect(page.locator("#app-status")).toBeHidden();
  await expect(page.locator(".pane-header")).toHaveCount(0);
  await expect(page.locator(".workspace h2")).toHaveCount(0);
  await expect(page.locator("#font-summary")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /generate/i })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "pixel please" })).toBeVisible();
  await expect(page.locator("#logo-title")).toHaveAttribute("data-logo-font", "ready", { timeout: 20_000 });

  const gridColumns = await page
    .locator(".workspace")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  expect(gridColumns).toBe(3);

  const sourceBox = await page.locator(".source-panel").boundingBox();
  const outputBox = await page.locator(".output-panel").boundingBox();
  const controlsBox = await page.locator(".controls-panel").boundingBox();

  expect(sourceBox?.x).toBeLessThan(outputBox?.x ?? 0);
  expect(outputBox?.x).toBeLessThan(controlsBox?.x ?? 0);
  const introMetrics = await page.evaluate(() => {
    const title = document.querySelector("h1");
    const copy = document.querySelector(".intro-copy");
    if (!title || !copy) {
      throw new Error("Missing intro elements");
    }

    const titleBox = title.getBoundingClientRect();
    const copyBox = copy.getBoundingClientRect();
    const introBox = document.querySelector(".intro")?.getBoundingClientRect();
    const sourceBox = document.querySelector(".source-panel")?.getBoundingClientRect();
    const controlsBox = document.querySelector(".controls-panel")?.getBoundingClientRect();
    const titleStyles = getComputedStyle(title);
    const copyStyles = getComputedStyle(copy);
    const selectStyles = getComputedStyle(document.querySelector("#google-font-select") as Element);

    return {
      copyLeft: copyBox.left,
      copyTop: copyBox.top,
      titleLeft: titleBox.left,
      titleTop: titleBox.top,
      titleTextAlign: titleStyles.textAlign,
      copyTextAlign: copyStyles.textAlign,
      introBottom: introBox?.bottom,
      sourceTop: sourceBox?.top,
      titleFontFamily: titleStyles.fontFamily,
      copyFontFamily: copyStyles.fontFamily,
      copyFontSize: copyStyles.fontSize,
      copyColor: copyStyles.color,
      selectFontFamily: selectStyles.fontFamily,
      selectFontSize: selectStyles.fontSize,
      selectColor: selectStyles.color,
      controlsWidth: controlsBox?.width,
    };
  });
  expect(introMetrics.copyLeft).toBeLessThan(introMetrics.titleLeft);
  expect(Math.abs(introMetrics.copyTop - introMetrics.titleTop)).toBeLessThan(1);
  expect(introMetrics.titleTextAlign).toBe("right");
  expect(introMetrics.copyTextAlign).toBe("left");
  expect((introMetrics.sourceTop ?? 0) - (introMetrics.introBottom ?? 0)).toBeLessThan(56);
  expect(introMetrics.titleFontFamily).toContain("PixelpleaseLogoFont");
  expect(introMetrics.copyFontFamily).toBe(introMetrics.selectFontFamily);
  expect(introMetrics.copyFontSize).toBe(introMetrics.selectFontSize);
  expect(introMetrics.copyColor).toBe(introMetrics.selectColor);
  expect(introMetrics.controlsWidth).toBeLessThanOrEqual(300);
  await expect(page.locator(".site-footer")).toHaveAttribute("aria-label", UI_COPY.footer.ariaLabel);
  await expect(page.locator(".footer-copy")).toHaveText(UI_COPY.footer.lines.join("\n"));

  const footerMetrics = await page.evaluate(() => {
    const workspace = document.querySelector(".workspace");
    const footer = document.querySelector(".site-footer");
    const footerCopy = document.querySelector(".footer-copy");
    const fieldLabel = document.querySelector(".field span");
    const faqAnswer = document.querySelector(".faq-item p");
    if (!workspace || !footer || !footerCopy || !fieldLabel || !faqAnswer) {
      throw new Error("Missing footer elements");
    }

    const workspaceBox = workspace.getBoundingClientRect();
    const footerBox = footer.getBoundingClientRect();
    const footerCopyBox = footerCopy.getBoundingClientRect();
    const footerStyles = getComputedStyle(footerCopy);
    const fieldLabelStyles = getComputedStyle(fieldLabel);
    const faqAnswerStyles = getComputedStyle(faqAnswer);

    return {
      footerCenterDelta: Math.abs(footerCopyBox.left + footerCopyBox.width / 2 - window.innerWidth / 2),
      footerTopGap: footerBox.top - workspaceBox.bottom,
      footerTextAlign: footerStyles.textAlign,
      footerFontSize: footerStyles.fontSize,
      footerLineHeight: footerStyles.lineHeight,
      footerColor: footerStyles.color,
      fieldFontSize: fieldLabelStyles.fontSize,
      fieldLineHeight: fieldLabelStyles.lineHeight,
      fieldColor: fieldLabelStyles.color,
      answerFontSize: faqAnswerStyles.fontSize,
      answerLineHeight: faqAnswerStyles.lineHeight,
      answerColor: faqAnswerStyles.color,
    };
  });

  expect(footerMetrics.footerCenterDelta).toBeLessThan(1);
  expect(footerMetrics.footerTopGap).toBeGreaterThanOrEqual(48);
  expect(footerMetrics.footerTextAlign).toBe("center");
  expect(footerMetrics.footerFontSize).toBe(footerMetrics.answerFontSize);
  expect(footerMetrics.footerLineHeight).toBe(footerMetrics.answerLineHeight);
  expect(footerMetrics.footerColor).toBe(footerMetrics.answerColor);
  await expect(page.locator(".source-panel #sample-text")).toBeVisible();
  await expect(page.locator(".source-panel #font-upload")).toBeAttached();
  await expect(page.locator("#source-mode-google")).toBeChecked();
  await expect(page.locator("#google-font-select")).toBeVisible();
  await expect(page.locator("#google-font-field .custom-select-trigger-label")).toHaveCount(1);
  await expect(page.locator("#upload-zone")).toBeHidden();
  await expect(page.locator("#coverage-label")).toHaveCount(0);
  await expect(page.locator("#glyph-grid")).toHaveCount(0);

  const layoutMetrics = await page.evaluate(() => {
    const sourcePanel = document.querySelector(".source-panel");
    const outputPanel = document.querySelector(".output-panel");
    const controlsPanel = document.querySelector(".controls-panel");
    const sourcePreview = document.querySelector("#source-editor-field");
    const outputPreview = [document.querySelector("#demo-preview-frame"), document.querySelector("#after-preview")]
      .filter((element): element is Element => Boolean(element))
      .find((element) => getComputedStyle(element).display !== "none");

    if (!sourcePanel || !outputPanel || !controlsPanel || !sourcePreview || !outputPreview) {
      throw new Error("Missing layout elements");
    }

    const sourcePanelBox = sourcePanel.getBoundingClientRect();
    const outputPanelBox = outputPanel.getBoundingClientRect();
    const controlsPanelBox = controlsPanel.getBoundingClientRect();
    const sourcePreviewBox = sourcePreview.getBoundingClientRect();
    const outputPreviewBox = outputPreview.getBoundingClientRect();

    return {
      sourcePreviewHeight: sourcePreviewBox.height,
      outputPreviewHeight: outputPreviewBox.height,
      sourcePreviewTop: sourcePreviewBox.top,
      outputPreviewTop: outputPreviewBox.top,
      controlsPanelTop: controlsPanelBox.top,
      sourcePreviewBottom: sourcePreviewBox.bottom,
      outputPreviewBottom: outputPreviewBox.bottom,
      sourcePanelBottom: sourcePanelBox.bottom,
      outputPanelBottom: outputPanelBox.bottom,
      controlsPanelBottom: controlsPanelBox.bottom,
    };
  });
  const previewTypography = await getCanvasTypographySyncMetrics(page);

  expect(Math.abs(layoutMetrics.sourcePreviewHeight - layoutMetrics.outputPreviewHeight)).toBeLessThan(2);
  expect(Math.abs(layoutMetrics.sourcePreviewTop - layoutMetrics.outputPreviewTop)).toBeLessThan(1);
  expect(Math.abs(layoutMetrics.sourcePreviewTop - layoutMetrics.controlsPanelTop)).toBeLessThan(1);
  expect(Math.abs(layoutMetrics.sourcePreviewBottom - layoutMetrics.outputPreviewBottom)).toBeLessThan(1);
  expect(Math.abs(layoutMetrics.sourcePanelBottom - layoutMetrics.outputPanelBottom)).toBeLessThan(1);
  expect(Math.abs(layoutMetrics.sourcePanelBottom - layoutMetrics.controlsPanelBottom)).toBeLessThan(1);
  expect(previewTypography.fontSizeDelta).toBeLessThan(0.01);
  expect(previewTypography.lineHeightDelta).toBeLessThan(0.01);
  expect(previewTypography.paddingLeftDelta).toBeLessThan(0.01);
  expect(previewTypography.paddingTopDelta).toBeLessThan(0.01);
  expect(previewTypography.canvasWidthDelta).toBeLessThan(1);
});

test("keeps source font selects equal width with single-line truncated labels", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  await page.locator("#google-font-select").selectOption("Playfair Display");
  await page.locator("#google-weight-select").selectOption("800-italic");
  await expect(page.locator("#google-font-field .custom-select-trigger-label")).toHaveText("Playfair Display");
  await expect(page.locator("#google-weight-field .custom-select-trigger-label")).toHaveText("ExtraBold Italic");

  const selectMetrics = await page.evaluate(() => {
    const toolbar = document.querySelector(".source-toolbar");
    const fontField = document.querySelector("#google-font-field");
    const weightField = document.querySelector("#google-weight-field");
    const fontTriggerLabel = document.querySelector("#google-font-field .custom-select-trigger-label");
    const weightTriggerLabel = document.querySelector("#google-weight-field .custom-select-trigger-label");
    const weightOptionLabel = document.querySelector("#google-weight-field .custom-select-option-label");

    if (!toolbar || !fontField || !weightField || !fontTriggerLabel || !weightTriggerLabel || !weightOptionLabel) {
      throw new Error("Missing source select elements");
    }

    const toolbarBox = toolbar.getBoundingClientRect();
    const fontBox = fontField.getBoundingClientRect();
    const weightBox = weightField.getBoundingClientRect();
    const fontLabelStyles = getComputedStyle(fontTriggerLabel);
    const weightLabelStyles = getComputedStyle(weightTriggerLabel);
    const weightOptionStyles = getComputedStyle(weightOptionLabel);
    const weightLabelRange = document.createRange();
    weightLabelRange.selectNodeContents(weightTriggerLabel);
    const weightLabelLineCount = new Set(
      Array.from(weightLabelRange.getClientRects()).map((rect) => Math.round(rect.top)),
    ).size;
    weightLabelRange.detach();

    return {
      toolbarWidth: toolbarBox.width,
      fontWidth: fontBox.width,
      weightWidth: weightBox.width,
      gap: weightBox.left - fontBox.right,
      fontLabelOverflow: fontLabelStyles.overflow,
      fontLabelTextOverflow: fontLabelStyles.textOverflow,
      fontLabelWhiteSpace: fontLabelStyles.whiteSpace,
      weightLabelOverflow: weightLabelStyles.overflow,
      weightLabelTextOverflow: weightLabelStyles.textOverflow,
      weightLabelWhiteSpace: weightLabelStyles.whiteSpace,
      weightOptionTextOverflow: weightOptionStyles.textOverflow,
      weightOptionWhiteSpace: weightOptionStyles.whiteSpace,
      weightLabelLineCount,
    };
  });

  expect(Math.abs(selectMetrics.fontWidth - selectMetrics.weightWidth)).toBeLessThan(1);
  expect(Math.abs(selectMetrics.fontWidth + selectMetrics.weightWidth + selectMetrics.gap - selectMetrics.toolbarWidth)).toBeLessThan(1);
  expect(selectMetrics.gap).toBeCloseTo(8, 0);
  expect(selectMetrics.fontLabelOverflow).toBe("hidden");
  expect(selectMetrics.fontLabelTextOverflow).toBe("ellipsis");
  expect(selectMetrics.fontLabelWhiteSpace).toBe("nowrap");
  expect(selectMetrics.weightLabelOverflow).toBe("hidden");
  expect(selectMetrics.weightLabelTextOverflow).toBe("ellipsis");
  expect(selectMetrics.weightLabelWhiteSpace).toBe("nowrap");
  expect(selectMetrics.weightOptionTextOverflow).toBe("ellipsis");
  expect(selectMetrics.weightOptionWhiteSpace).toBe("nowrap");
  expect(selectMetrics.weightLabelLineCount).toBe(1);
});

test("stacks the intro when the header no longer fits horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 760 });
  await page.goto("/");

  const metrics = await page.evaluate(() => {
    const intro = document.querySelector(".intro");
    const title = document.querySelector("h1");
    const copy = document.querySelector(".intro-copy");
    const workspace = document.querySelector(".workspace");
    const controls = document.querySelector(".controls-panel");
    if (!intro || !title || !copy || !workspace || !controls) {
      throw new Error("Missing intro elements");
    }

    const introBox = intro.getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    const copyBox = copy.getBoundingClientRect();
    const titleStyles = getComputedStyle(title);
    const copyStyles = getComputedStyle(copy);
    const workspaceStyles = getComputedStyle(workspace);
    const copyRange = document.createRange();
    copyRange.selectNodeContents(copy);
    const copyLineCount = new Set(
      Array.from(copyRange.getClientRects()).map((rect) => Math.round(rect.top)),
    ).size;
    copyRange.detach();

    return {
      titleCenterDelta: Math.abs(titleBox.left + titleBox.width / 2 - (introBox.left + introBox.width / 2)),
      copyCenterDelta: Math.abs(copyBox.left + copyBox.width / 2 - (introBox.left + introBox.width / 2)),
      copyBelowTitle: copyBox.top > titleBox.bottom,
      titleCopyGap: copyBox.top - titleBox.bottom,
      copyLineCount,
      titleTextAlign: titleStyles.textAlign,
      copyTextAlign: copyStyles.textAlign,
      controlsWidth: controls.getBoundingClientRect().width,
      gridColumns: workspaceStyles.gridTemplateColumns.split(" ").length,
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    };
  });

  expect(metrics.titleCenterDelta).toBeLessThan(1);
  expect(metrics.copyCenterDelta).toBeLessThan(1);
  expect(metrics.copyBelowTitle).toBe(true);
  expect(metrics.titleCopyGap).toBeCloseTo(22, 0);
  expect(metrics.copyLineCount).toBeGreaterThanOrEqual(2);
  expect(metrics.copyLineCount).toBeLessThanOrEqual(4);
  expect(metrics.titleTextAlign).toBe("center");
  expect(metrics.copyTextAlign).toBe("center");
  expect(metrics.controlsWidth).toBeGreaterThan(700);
  expect(metrics.gridColumns).toBe(1);
  expect(metrics.overflow).toBe(0);
});

test("switches Source between Google Font editing and same-size upload drop zone", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.locator("#source-mode-google")).toBeChecked();
  await expect(page.locator("#sample-text")).toBeVisible();
  await expect(page.locator("#sample-text")).toBeFocused();
  const sourceFocusStyles = await page.locator("#sample-text").evaluate((textarea) => {
    const styles = getComputedStyle(textarea);
    return {
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      outlineColor: styles.outlineColor,
      outlineStyle: styles.outlineStyle,
    };
  });
  expect(sourceFocusStyles.backgroundColor).toBe("rgb(255, 255, 255)");
  expect(sourceFocusStyles.borderColor).toBe("rgb(17, 17, 17)");
  expect(sourceFocusStyles.outlineColor).toBe("rgb(17, 17, 17)");
  expect(sourceFocusStyles.outlineStyle).toBe("solid");
  await page.locator("#google-font-select").focus();
  await expect(page.locator("#sample-text")).toHaveCSS("background-color", "rgb(245, 245, 245)");
  await expect(page.locator("#google-font-select")).toBeVisible();
  await expect(page.locator("#google-font-field .custom-select-trigger-label")).toHaveCount(1);
  await expect(page.locator("#upload-zone")).toBeHidden();
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await expect(page.locator("#after-preview")).toBeHidden();
  await expect(page.locator("#demo-preview-canvas")).toBeVisible();
  await expectPixelCanvasHasInk(page);

  const sourcePanelBox = await page.locator(".source-panel").boundingBox();
  const sourcePreviewBox = await page.locator("#source-editor-field").boundingBox();
  const googleSelectBox = await page.locator("#google-font-select").boundingBox();
  const outputBeforeModeSwitch = await page.locator("#after-preview").evaluate((preview) => {
    const styles = getComputedStyle(preview);
    return {
      fontFamily: styles.fontFamily,
      text: preview.textContent,
    };
  });
  const blobBeforeModeSwitch = await getGeneratedFontUrl(page);

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await expect(page.locator("#source-mode-upload")).toBeChecked();
  await expect(page.locator("#sample-text")).toBeHidden();
  await expect(page.locator("#google-font-select")).toBeHidden();
  await expect(page.locator("#upload-zone")).toBeVisible();
  await expect(page.locator("#after-preview")).toBeHidden();
  await expect(page.locator("#demo-preview-canvas")).toBeVisible();
  await expect(page.getByText("choose font file")).toHaveCount(0);
  await expect(page.locator("#upload-zone .upload-title")).toHaveText(UI_COPY.source.uploadTitle);
  await expect(page.getByText(/license to edit/i)).toBeVisible();
  await expect(page.locator(".upload-button")).toHaveCount(0);
  const uploadZoneStyles = await page.locator("#upload-zone").evaluate((zone) => {
    const styles = getComputedStyle(zone);
    return {
      borderColor: styles.borderColor,
      borderRadius: styles.borderRadius,
      borderStyle: styles.borderStyle,
    };
  });
  expect(uploadZoneStyles.borderColor).toBe("rgb(17, 17, 17)");
  expect(uploadZoneStyles.borderRadius).toBe("999px");
  expect(uploadZoneStyles.borderStyle).toBe("dashed");

  const uploadPanelBox = await page.locator(".source-panel").boundingBox();
  const uploadBox = await page.locator("#upload-zone").boundingBox();
  const outputAfterModeSwitch = await page.locator("#after-preview").evaluate((preview) => {
    const styles = getComputedStyle(preview);
    return {
      fontFamily: styles.fontFamily,
      text: preview.textContent,
    };
  });
  const blobAfterModeSwitch = await getGeneratedFontUrl(page);
  expect(Math.abs((sourcePanelBox?.width ?? 0) - (uploadPanelBox?.width ?? 0))).toBeLessThan(1);
  expect(Math.abs((sourcePanelBox?.height ?? 0) - (uploadPanelBox?.height ?? 0))).toBeLessThan(1);
  expect(Math.abs((sourcePreviewBox?.height ?? 0) - (uploadBox?.height ?? 0))).toBeLessThan(2);
  expect(outputAfterModeSwitch).toEqual(outputBeforeModeSwitch);
  expect(blobAfterModeSwitch).toBe(blobBeforeModeSwitch);

  await page.getByRole("radio", { name: UI_COPY.sourceModes.google }).check();
  await expect(page.locator("#source-mode-google")).toBeChecked();
  await expect(page.locator("#sample-text")).toBeVisible();
  await expect(page.locator("#google-font-select")).toBeVisible();
  await expect(page.locator("#upload-zone")).toBeHidden();
  await expect(page.locator("#after-preview")).toBeHidden();
  await expect(page.locator("#demo-preview-canvas")).toBeVisible();

  const outputAfterReturn = await page.locator("#after-preview").evaluate((preview) => {
    const styles = getComputedStyle(preview);
    return {
      fontFamily: styles.fontFamily,
      text: preview.textContent,
    };
  });
  const blobAfterReturn = await getGeneratedFontUrl(page);
  expect(outputAfterReturn).toEqual(outputBeforeModeSwitch);
  expect(blobAfterReturn).toBe(blobBeforeModeSwitch);

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await expect(page.locator("#upload-zone")).toBeVisible();
  await page.locator("#font-upload").setInputFiles(sourcePath);
  await expect(page.locator("#sample-text")).toBeVisible();
  await expect(page.locator("#upload-zone")).toBeHidden();
  await expect(page.getByRole("button", { name: UI_COPY.source.replaceFont })).toBeVisible();
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  const uploadedPanelBox = await page.locator(".source-panel").boundingBox();
  const uploadedPreviewBox = await page.locator("#source-editor-field").boundingBox();
  const replaceButtonBox = await page.getByRole("button", { name: UI_COPY.source.replaceFont }).boundingBox();
  const replaceButtonStyles = await page.getByRole("button", { name: UI_COPY.source.replaceFont }).evaluate((button) => {
    const styles = getComputedStyle(button);
    return {
      borderColor: styles.borderColor,
      borderRadius: styles.borderRadius,
    };
  });
  expect(Math.abs((sourcePanelBox?.width ?? 0) - (uploadedPanelBox?.width ?? 0))).toBeLessThan(1);
  expect(Math.abs((sourcePanelBox?.height ?? 0) - (uploadedPanelBox?.height ?? 0))).toBeLessThan(1);
  expect(Math.abs((sourcePreviewBox?.height ?? 0) - (uploadedPreviewBox?.height ?? 0))).toBeLessThan(2);
  expect(Math.abs((googleSelectBox?.height ?? 0) - (replaceButtonBox?.height ?? 0))).toBeLessThan(1);
  expect(replaceButtonStyles.borderColor).toBe("rgb(17, 17, 17)");
  expect(replaceButtonStyles.borderRadius).toBe("999px");

  await page.getByRole("radio", { name: UI_COPY.sourceModes.google }).check();
  await expect(page.locator("#source-mode-google")).toBeChecked();
  await expect(page.locator("#google-font-select")).toBeVisible();
  await expect(page.locator("#google-weight-select")).toBeVisible();
  await expect(page.getByRole("button", { name: UI_COPY.source.replaceFont })).toBeHidden();
  await expect(page.locator("#upload-zone")).toBeHidden();

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await expect(page.locator("#source-mode-upload")).toBeChecked();
  await expect(page.locator("#google-weight-select")).toBeHidden();
  await expect(page.locator("#sample-text")).toBeVisible();
  await expect(page.locator("#upload-zone")).toBeHidden();
  await expect(page.getByRole("button", { name: UI_COPY.source.replaceFont })).toBeVisible();
  await expect(page.locator("#sample-text")).toHaveCSS("font-family", /SourcePreviewFont/);
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
});

test("focuses source text at the end and starts with Merriweather Google demo font", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#sample-text")).toBeFocused();
  const caret = await page.locator("#sample-text").evaluate((textarea) => {
    const input = textarea as HTMLTextAreaElement;
    return {
      start: input.selectionStart,
      end: input.selectionEnd,
      length: input.value.length,
    };
  });

  expect(caret.start).toBe(caret.length);
  expect(caret.end).toBe(caret.length);

  await expect(page.locator("#google-font-select")).toBeVisible();
  await expect(page.locator("#google-weight-select")).toBeVisible();
  const fontOptions = await page.locator("#google-font-select option").allTextContents();
  const weightOptions = await page.locator("#google-weight-select option").allTextContents();
  expect(fontOptions.length).toBeGreaterThanOrEqual(5);
  expect(fontOptions).toEqual(
    expect.arrayContaining([
      "Alan Sans",
      "Inter",
      "Instrument Sans",
      "Montserrat",
      "Bebas Neue",
      "Fraunces",
      "Playfair Display",
      "Geist Mono",
    ]),
  );
  expect(fontOptions.every((option) => !option.includes(" / "))).toBe(true);
  expect(weightOptions).toEqual(expect.arrayContaining(["Regular", "Regular Italic", "Bold", "Bold Italic"]));
  await expect(page.locator("#google-font-select")).toHaveValue("Merriweather");
  await expect(page.locator("#google-weight-select")).toHaveValue("400");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  const initialBlobUrl = await getGeneratedFontUrl(page);

  await page.locator("#google-weight-select").selectOption("700");
  await expect(page.locator("#sample-text")).toHaveCSS("font-weight", "700");
  await expect(page.locator("#sample-text")).toHaveCSS("font-style", "normal");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await expect
    .poll(
      async () => {
        const url = await getGeneratedFontUrl(page);
        return Boolean(url && url !== initialBlobUrl);
      },
      { timeout: 20_000 },
    )
    .toBe(true);
  await expect(page.locator("#demo-preview-canvas")).toHaveAttribute("data-render-font-weight", "700");
  const boldBlobUrl = await getGeneratedFontUrl(page);

  const currentFont = await page.locator("#google-font-select").inputValue();
  expect(currentFont).toBe("Merriweather");
  await page.locator("#sample-text").fill("MMMM iiiiii 123");
  const nextFont = await page.locator("#google-font-select").evaluate((select) => {
    const element = select as HTMLSelectElement;
    return Array.from(element.options).find((option) => option.value !== element.value)?.value;
  });
  expect(nextFont).toBeTruthy();

  await page.locator("#google-font-select").selectOption(nextFont as string);
  const sourceFontFamily = await page.locator("#sample-text").evaluate((textarea) =>
    getComputedStyle(textarea).fontFamily,
  );

  expect(sourceFontFamily).toContain(nextFont as string);
  await expect(page.locator("#google-weight-select")).toHaveValue("700");
  expect(nextFont).not.toBe(currentFont);
  await expect
    .poll(
      async () => {
        const url = await getGeneratedFontUrl(page);
        return Boolean(url && url !== boldBlobUrl);
      },
      { timeout: 20_000 },
    )
    .toBe(true);
});

test("updates weight options for the expanded Google Font set", async ({ page }) => {
  const withItalic = (weights: string[]) => weights.flatMap((weight) => [weight, `${weight} Italic`]);
  const weights100To900 = ["Thin", "ExtraLight", "Light", "Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Black"];
  const expectedFonts = [
    { family: "Alan Sans", weights: weights100To900.slice(2) },
    { family: "IBM Plex Sans", weights: withItalic(weights100To900.slice(0, 7)) },
    { family: "Lato", weights: withItalic(weights100To900) },
    { family: "Libre Baskerville", weights: withItalic(["Regular", "Medium", "SemiBold", "Bold"]) },
    { family: "Merriweather", weights: withItalic(weights100To900.slice(2)) },
    { family: "Roboto Mono", weights: withItalic(weights100To900.slice(0, 7)) },
    { family: "Space Grotesk", weights: ["Light", "Regular", "Medium", "Bold"] },
    { family: "Inter", weights: withItalic(weights100To900) },
    { family: "Instrument Sans", weights: withItalic(["Regular", "Medium", "SemiBold", "Bold"]) },
    { family: "Montserrat", weights: withItalic(weights100To900) },
    { family: "Bebas Neue", weights: ["Regular"] },
    { family: "Fraunces", weights: withItalic(weights100To900) },
    { family: "Playfair Display", weights: withItalic(["Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Black"]) },
    { family: "Geist Mono", weights: withItalic(weights100To900) },
  ];

  await page.goto("/");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  for (const expectedFont of expectedFonts) {
    const previousUrl = await getGeneratedFontUrl(page);
    await page.locator("#google-font-select").selectOption(expectedFont.family);

    await expect
      .poll(
        async () => {
          const url = await getGeneratedFontUrl(page);
          return Boolean(url && url !== previousUrl);
        },
        { timeout: 20_000 },
      )
      .toBe(true);

    await expect(page.locator("#google-weight-select option")).toHaveText(expectedFont.weights);
    await expect(page.locator("#google-weight-select")).toHaveValue("400");
  }
});

test("generates Alan Sans using only same-origin font and license assets", async ({ page }) => {
  const fontAndLicenseRequests: string[] = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (
      requestUrl.pathname.startsWith("/fonts/") ||
      /\.(?:otf|ttf|woff2?)$/i.test(requestUrl.pathname) ||
      requestUrl.pathname.endsWith("OFL.txt")
    ) {
      fontAndLicenseRequests.push(request.url());
    }
  });

  await page.goto("/");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  const initialUrl = await getGeneratedFontUrl(page);

  await page.locator("#google-font-select").selectOption("Alan Sans");
  await expect(page.locator("#google-weight-select option")).toHaveText([
    "Light",
    "Regular",
    "Medium",
    "SemiBold",
    "Bold",
    "ExtraBold",
    "Black",
  ]);
  await expect(page.locator("#google-weight-select")).toHaveValue("400");
  await expect
    .poll(
      async () => {
        const url = await getGeneratedFontUrl(page);
        return Boolean(url && url !== initialUrl);
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  const pageOrigin = new URL(page.url()).origin;
  expect(fontAndLicenseRequests).toEqual(
    expect.arrayContaining([
      `${pageOrigin}/fonts/google/alansans/AlanSans-Regular.ttf`,
      `${pageOrigin}/fonts/google/licenses/alansans-OFL.txt`,
    ]),
  );
  for (const requestUrl of fontAndLicenseRequests) {
    const parsedUrl = new URL(requestUrl);
    expect(parsedUrl.origin, requestUrl).toBe(pageOrigin);
    expect(parsedUrl.pathname, requestUrl).toMatch(/^\/fonts\/google\//);
  }
});

test("generates and packages a real italic Google Font style", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await expect(page.locator("#google-font-select")).toHaveValue("Merriweather");

  const initialUrl = await getGeneratedFontUrl(page);
  await page.locator("#google-weight-select").selectOption("400-italic");
  await expect(page.locator("#google-weight-select")).toHaveValue("400-italic");
  await expect(page.locator("#sample-text")).toHaveCSS("font-weight", "400");
  await expect(page.locator("#sample-text")).toHaveCSS("font-style", "italic");
  await expect
    .poll(
      async () => {
        const url = await getGeneratedFontUrl(page);
        return Boolean(url && url !== initialUrl);
      },
      { timeout: 20_000 },
    )
    .toBe(true);
  await expect(page.locator("#demo-preview-canvas")).toHaveAttribute("data-render-font-weight", "400");
  await expect(page.locator("#demo-preview-canvas")).toHaveAttribute("data-render-font-style", "italic");
  await expect(page.locator("#download-link")).not.toHaveClass(/is-disabled/);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: UI_COPY.controls.downloadTtf }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^PixelPlease-Mrrwthr-20-42-0-[A-Z0-9]{4}-Regular-Italic\.zip$/);
  await download.saveAs(googleItalicGeneratedPackagePath);

  const packageBytes = await fs.readFile(googleItalicGeneratedPackagePath);
  const packageEntries = readStoredZip(packageBytes);
  const notice = new TextDecoder().decode(packageEntries["NOTICE.txt"]);
  const [generatedName, generated] = getSingleTtfEntry(packageEntries);
  const parsed = opentype.parse(generated.buffer.slice(generated.byteOffset, generated.byteOffset + generated.byteLength));

  expect(generatedName).toMatch(/^PixelPlease-Mrrwthr-20-42-0-[A-Z0-9]{4}-Regular-Italic\.ttf$/);
  expect(notice).toContain("Generated font style: Regular Italic");
  expect(notice).toContain("Source font: Merriweather Regular Italic");
  expect(notice).toContain("Source file: Merriweather-RegularItalic.ttf");
  expect(notice).toContain("Merriweather-Italic%5Bopsz%2Cwdth%2Cwght%5D.ttf");
  expect(parsed.names.fontSubfamily.en).toBe("Regular Italic");
  expect(parsed.names.fullName.en).toBe(`${parsed.names.fontFamily.en} Regular Italic`);
});

test("renders a usable generated Google Font output before upload", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await expect(page.locator("#google-font-select")).toHaveValue("Merriweather");
  await expect(page.locator("#after-preview")).toBeHidden();
  await expect(page.locator("#demo-preview-canvas")).toBeVisible();
  await expectPixelCanvasHasInk(page);
  await expect(page.locator("#download-link")).not.toHaveClass(/is-disabled/);

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await expect(page.locator("#upload-zone")).toBeVisible();

  const uploadModeBlobBeforeControls = await getGeneratedFontUrl(page);
  await page.locator("#pixels-per-em").fill("21");
  await expect
    .poll(
      async () => {
        const url = await getGeneratedFontUrl(page);
        return Boolean(url && url !== uploadModeBlobBeforeControls);
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  const googleDownloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: UI_COPY.controls.downloadTtf }).click();
  const googleDownload = await googleDownloadPromise;
  await googleDownload.saveAs(googleGeneratedPackagePath);

  const googlePackageBytes = await fs.readFile(googleGeneratedPackagePath);
  const googlePackageEntries = readStoredZip(googlePackageBytes);
  const googleNotice = new TextDecoder().decode(googlePackageEntries["NOTICE.txt"]);
  const [googleGeneratedName, googleGenerated] = getSingleTtfEntry(googlePackageEntries);
  const googleParsed = opentype.parse(
    googleGenerated.buffer.slice(googleGenerated.byteOffset, googleGenerated.byteOffset + googleGenerated.byteLength),
  );

  expect(googleGeneratedName).toMatch(/^PixelPlease-Mrrwthr-21-42-0-[A-Z0-9]{4}-Regular\.ttf$/);
  expect(Object.keys(googlePackageEntries).sort()).toEqual([
    "NOTICE.txt",
    googleGeneratedName,
    "licenses/merriweather-OFL.txt",
  ].sort());
  expect(googleNotice).toContain("Merriweather");
  expect(googleNotice).toContain("Source license: OFL");
  expect(googleNotice).toContain("Source license file: merriweather-OFL.txt");
  expect(googleNotice).toContain("Bundled source license package path: licenses/merriweather-OFL.txt");
  expect(googleNotice).toContain("Generated font naming: PixelPlease + compact source code + effect recipe + short hash + style.");
  expect(googleNotice).toContain("Effect recipe format: cells-per-em-threshold-expand.");
  expect(googleNotice).toContain("Merriweather Regular");
  expect(googleNotice).toContain("Merriweather-Regular.ttf");
  expect(new TextDecoder().decode(googlePackageEntries["licenses/merriweather-OFL.txt"])).toContain(
    "Reserved Font Name \"Merriweather\"",
  );
  expect(googleParsed.names.fontFamily.en).toMatch(/^PixelPlease Mrrwthr 21-42-0 [A-Z0-9]{4}$/);
  expect(googleParsed.names.fontSubfamily.en).toBe("Regular");
  expect(googleParsed.names.fullName.en).toBe(`${googleParsed.names.fontFamily.en} Regular`);
  expect(googleParsed.names.postScriptName.en).toBe(googleParsed.names.fullName.en.replaceAll(" ", "-"));
  expect(googleParsed.names.fontFamily.en).not.toContain("Merriweather");
  expect(googleParsed.names.licenseURL.en).toBe("https://openfontlicense.org");

  await page.getByRole("radio", { name: UI_COPY.sourceModes.google }).check();
  await expect(page.locator("#sample-text")).toBeVisible();

  await page.locator("#sample-text").fill("Editable source text");
  await expect(page.locator("#after-preview")).toHaveText("Editable source text");

  const beforeBlobUrl = await getGeneratedFontUrl(page);
  await page.locator("#pixels-per-em").fill("10");
  await page.locator("#threshold").fill("28");
  await page.locator("#expand").fill("2");
  await page.locator("#shift-x").fill("0.35");
  await page.locator("#shift-y").fill("-0.25");

  await expect
    .poll(
      async () => {
        const url = await getGeneratedFontUrl(page);
        return Boolean(url && url !== beforeBlobUrl);
      },
      { timeout: 20_000 },
    )
    .toBe(true);
});

test("switches between pixel effects for preview and generated font", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await expect(page.locator("#logo-title")).toHaveAttribute("data-logo-font", "ready", { timeout: 20_000 });
  await expect(page.locator("#logo-title")).toHaveAttribute("data-logo-pixel-shape", "square");
  const effectSelect = page.locator("#pixel-effect-select");
  const pixelsPerEmLabel = page.locator(".control-stack > .field > span").first();
  await expect(effectSelect).toHaveValue("square");
  await expect(pixelsPerEmLabel).toHaveText(UI_COPY.controls.pixelsPerEm);
  await expect(effectSelect.locator("option")).toHaveText([
    UI_COPY.controls.squarePixels,
    UI_COPY.controls.roundPixels,
    UI_COPY.controls.verticalLines,
    UI_COPY.controls.horizontalLines,
  ]);
  const effectSelectTrigger = page.locator("#pixel-effect-field .custom-select-trigger");
  await expect(effectSelectTrigger).toBeVisible();
  await expect(effectSelectTrigger).toHaveText(UI_COPY.controls.squarePixels);
  await effectSelectTrigger.hover();
  await expect(effectSelectTrigger).toHaveCSS("cursor", /none/);
  await expect(page.locator(".custom-cursor")).toHaveAttribute("data-cursor-shape", "pointer");
  await effectSelectTrigger.click();
  await expect(effectSelectTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#pixel-effect-field .custom-select-menu")).toHaveCSS("box-shadow", /0px -8px 0px/);
  const horizontalLinesOption = page.locator("#pixel-effect-field .custom-select-option").filter({
    hasText: UI_COPY.controls.horizontalLines,
  });
  await horizontalLinesOption.hover();
  await expect(horizontalLinesOption).toHaveCSS("cursor", /none/);
  await expect(page.locator(".custom-cursor")).toHaveAttribute("data-cursor-shape", "pointer");
  await horizontalLinesOption.click();
  await expect(effectSelect).toHaveValue("horizontal-lines");
  await expect(pixelsPerEmLabel).toHaveText(UI_COPY.controls.linesPerEm);
  await expect(effectSelectTrigger).toHaveText(UI_COPY.controls.horizontalLines);
  await effectSelect.selectOption("square");
  await expect(effectSelectTrigger).toHaveText(UI_COPY.controls.squarePixels);
  await expect(pixelsPerEmLabel).toHaveText(UI_COPY.controls.pixelsPerEm);
  await effectSelectTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(effectSelectTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#pixel-effect-field .custom-select-option.is-selected")).toHaveText(UI_COPY.controls.squarePixels);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(effectSelect).toHaveValue("round");
  await expect(effectSelectTrigger).toHaveText(UI_COPY.controls.roundPixels);
  await expect(pixelsPerEmLabel).toHaveText(UI_COPY.controls.dotsPerEm);
  await effectSelect.selectOption("square");
  await expect(effectSelectTrigger).toHaveText(UI_COPY.controls.squarePixels);
  await expect(pixelsPerEmLabel).toHaveText(UI_COPY.controls.pixelsPerEm);

  const squareSignature = await getPixelCanvasSignature(page);
  const squareGeneratedUrl = await getGeneratedFontUrl(page);
  const squareLogoCommands = await getInstalledFontGlyphCommandTypes(page, "PixelpleaseLogoFont", "p");
  const squareHeadingMetrics = await getLogoHeadingMetrics(page);
  expect(squareLogoCommands).toContain("L");
  expect(squareLogoCommands).not.toContain("C");

  await effectSelect.selectOption("round");
  await expect(effectSelect).toHaveValue("round");
  await expect(pixelsPerEmLabel).toHaveText(UI_COPY.controls.dotsPerEm);
  await expect(page.locator("#logo-title")).toHaveAttribute("data-logo-font", "ready", { timeout: 20_000 });
  await expect(page.locator("#logo-title")).toHaveAttribute("data-logo-pixel-shape", "round");
  await expect(page.getByRole("button", { name: UI_COPY.controls.resetDefaults })).toBeEnabled();

  const roundLogoCommands = await getInstalledFontGlyphCommandTypes(page, "PixelpleaseLogoFont", "p");
  const roundHeadingMetrics = await getLogoHeadingMetrics(page);
  expect(roundLogoCommands).toContain("C");
  expect(roundHeadingMetrics).toEqual(squareHeadingMetrics);

  await expect
    .poll(
      async () => {
        const url = await getGeneratedFontUrl(page);
        return Boolean(url && url !== squareGeneratedUrl);
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  await expect
    .poll(
      async () => {
        const signature = await getPixelCanvasSignature(page);
        return signature.hash !== squareSignature.hash && signature.darkSamples > 12;
      },
      { timeout: 5_000 },
    )
    .toBe(true);

  let previousSignature = await getPixelCanvasSignature(page);

  for (const effect of ["vertical-lines", "horizontal-lines"] as const) {
    const previousGeneratedUrl = await getGeneratedFontUrl(page);
    await effectSelect.selectOption(effect);
    await expect(effectSelect).toHaveValue(effect);
    await expect(pixelsPerEmLabel).toHaveText(UI_COPY.controls.linesPerEm);
    await expect(page.locator("#logo-title")).toHaveAttribute("data-logo-pixel-shape", effect, { timeout: 20_000 });

    await expect
      .poll(
        async () => {
          const url = await getGeneratedFontUrl(page);
          return Boolean(url && url !== previousGeneratedUrl);
        },
        { timeout: 20_000 },
      )
      .toBe(true);

    await expect
      .poll(
        async () => {
          const signature = await getPixelCanvasSignature(page);
          return signature.hash !== previousSignature.hash && signature.darkSamples > 12;
        },
        { timeout: 5_000 },
      )
      .toBe(true);

    previousSignature = await getPixelCanvasSignature(page);
  }

  await page.getByRole("button", { name: UI_COPY.controls.resetDefaults }).click();
  await expect(effectSelect).toHaveValue("square");
  await expect(pixelsPerEmLabel).toHaveText(UI_COPY.controls.pixelsPerEm);
  await expect(page.locator("#logo-title")).toHaveAttribute("data-logo-pixel-shape", "square");
});

test("keeps generated output canvas-backed at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await expect(page.locator("#after-preview")).toBeHidden();
  await expect(page.locator("#demo-preview-canvas")).toBeVisible();
  await expect(page.locator("#download-link")).not.toHaveClass(/is-disabled/);

  const firstSignature = await expectPixelCanvasHasInk(page);
  await page.locator("#sample-text").fill("Mobile pixel test");
  await expect(page.locator("#after-preview")).toHaveText("Mobile pixel test");

  await expect
    .poll(
      async () => {
        const nextSignature = await getPixelCanvasSignature(page);
        return nextSignature.hash !== firstSignature.hash && nextSignature.darkSamples > 12;
      },
      { timeout: 5_000 },
    )
    .toBe(true);
});

test("wraps generated canvas output instead of squeezing it in narrow columns", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 760 });
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await page
    .locator("#sample-text")
    .fill(
      [
        ...Array.from({ length: 12 }, () => "PixelpleaseSupercalifragilisticexpialidociousPixelOutputWrapCheck"),
      ].join(" "),
    );

  await expect
    .poll(
      async () => {
        const metrics = await getPixelCanvasLayoutMetrics(page);
        return (
          metrics.cssWidth > 700 &&
          Math.abs(metrics.backingCssWidth - metrics.cssWidth) < 1 &&
          metrics.frameScrollHeight > metrics.frameClientHeight + 40 &&
          metrics.canvasCssHeight > metrics.frameClientHeight + 40 &&
          metrics.bottomDarkSamples > 20
        );
      },
      { timeout: 5_000 },
    )
    .toBe(true);
});

test("keeps generated canvas typography synced with source across resizes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  const desktopMetrics = await expectCanvasTypographySynced(page);

  await page.setViewportSize({ width: 1200, height: 760 });
  const stackedMetrics = await expectCanvasTypographySynced(page);
  expect(stackedMetrics.frameWidth).toBeGreaterThan(desktopMetrics.frameWidth);

  await page.setViewportSize({ width: 390, height: 844 });
  const phoneMetrics = await expectCanvasTypographySynced(page);
  expect(phoneMetrics.renderFontSize).toBeLessThan(desktopMetrics.renderFontSize);
  expect(phoneMetrics.frameWidth).toBeLessThan(desktopMetrics.frameWidth);
});

test("removes manual generation, resets controls, and keeps Download package primary", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /generate/i })).toHaveCount(0);
  const resetButton = page.getByRole("button", { name: UI_COPY.controls.resetDefaults });
  await expect(resetButton).toBeVisible();
  await expect(resetButton).toBeDisabled();

  await page.locator("#pixels-per-em").fill("12");
  await expect(resetButton).toBeEnabled();
  await page.locator("#threshold").fill("28");
  await page.locator("#expand").fill("2");
  await page.locator("#shift-x").fill("0.35");
  await page.locator("#shift-y").fill("-0.25");
  await resetButton.click();

  await expect(page.locator("#pixels-per-em")).toHaveValue("20");
  await expect(page.locator("#threshold")).toHaveValue("42");
  await expect(page.locator("#expand")).toHaveValue("0");
  await expect(page.locator("#shift-x")).toHaveValue("0");
  await expect(page.locator("#shift-y")).toHaveValue("0");
  await expect(resetButton).toBeDisabled();

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await page.locator("#font-upload").setInputFiles(sourcePath);
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  const downloadStyles = await page.locator("#download-link").evaluate((link) => {
    const styles = getComputedStyle(link);
    return {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      borderRadius: styles.borderRadius,
      height: link.getBoundingClientRect().height,
    };
  });
  const resetStyles = await resetButton.evaluate((button) => {
    const styles = getComputedStyle(button);
    return {
      borderRadius: styles.borderRadius,
      height: button.getBoundingClientRect().height,
    };
  });
  const actionGap = await page.locator(".controls-panel").evaluate((panel) => {
    const controlStack = panel.querySelector(".control-stack")?.getBoundingClientRect();
    const actionStack = panel.querySelector(".action-stack")?.getBoundingClientRect();
    if (!controlStack || !actionStack) {
      throw new Error("Missing control/action stack");
    }
    return actionStack.top - controlStack.bottom;
  });
  const controlGap = await page
    .locator(".control-stack")
    .evaluate((stack) => getComputedStyle(stack).rowGap);

  expect(downloadStyles.backgroundColor).toBe("rgb(17, 17, 17)");
  expect(downloadStyles.color).toBe("rgb(255, 255, 255)");
  expect(downloadStyles.height).toBeGreaterThanOrEqual(56);
  expect(downloadStyles.borderRadius).toBe("999px");
  expect(resetStyles.borderRadius).toBe("999px");
  expect(actionGap).toBeGreaterThanOrEqual(32);
  expect(controlGap).toBe("18px");
});

test("keeps controls compact while separating buttons at small sizes", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 560 });
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  const shortViewportMetrics = await getControlsSpacingMetrics(page);
  expect(shortViewportMetrics.controlGap).toBe("18px");
  expect(shortViewportMetrics.actionGap).toBeGreaterThanOrEqual(24);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileMetrics = await getControlsSpacingMetrics(page);
  expect(mobileMetrics.controlGap).toBe("18px");
  expect(mobileMetrics.actionGap).toBeGreaterThanOrEqual(48);
});

test("keeps stacked layout gutters and panel heights aligned", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 560 });
  await page.goto("/");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  const shortDesktopMetrics = await getPanelLayoutMetrics(page);
  expect(shortDesktopMetrics.gridColumnCount).toBe(3);
  expect(shortDesktopMetrics.sourceOutputHeightDelta).toBeLessThan(1);
  expect(shortDesktopMetrics.sourceControlsHeightDelta).toBeLessThan(1);
  expect(shortDesktopMetrics.actionGap).toBeGreaterThanOrEqual(24);
  expect(shortDesktopMetrics.actionOverflow).toBeLessThan(1);

  await page.setViewportSize({ width: 390, height: 620 });
  const stackedMetrics = await getPanelLayoutMetrics(page);

  expect(stackedMetrics.gridColumnCount).toBe(1);
  expect(stackedMetrics.shellPaddingLeft).toBeGreaterThanOrEqual(24);
  expect(stackedMetrics.shellPaddingRight).toBe(stackedMetrics.shellPaddingLeft);
  expect(Math.abs(stackedMetrics.workspaceLeftInset - stackedMetrics.shellPaddingLeft)).toBeLessThan(1);
  expect(Math.abs(stackedMetrics.workspaceRightInset - stackedMetrics.shellPaddingRight)).toBeLessThan(1);
  expect(stackedMetrics.sourceOutputHeightDelta).toBeLessThan(1);
  expect(stackedMetrics.sourceControlsHeightDelta).toBeLessThan(1);
  expect(stackedMetrics.actionGap).toBeGreaterThanOrEqual(24);
  expect(stackedMetrics.actionOverflow).toBeLessThan(1);
});

test("uploads a TTF through the Source drop zone, pixelizes Basic Latin, downloads a packaged usable TTF", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await expect(page.locator("#upload-zone .upload-title")).toHaveText(UI_COPY.source.uploadTitle);
  const fixtureBase64 = (await fs.readFile(sourcePath)).toString("base64");
  await page.evaluate((base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const file = new File([bytes], "fixture-source.ttf", { type: "font/ttf" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const event = new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });
    document.getElementById("upload-zone")?.dispatchEvent(event);
  }, fixtureBase64);

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  await page.locator("#pixels-per-em").fill("18");
  await page.locator("#threshold").fill("36");
  await page.locator("#shift-x").fill("0.25");
  await page.locator("#shift-y").fill("-0.2");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await expect(page.locator("#after-preview")).toBeHidden();
  await expect(page.locator("#demo-preview-canvas")).toBeVisible();
  await expectPixelCanvasHasInk(page);
  await page.screenshot({ path: path.join(artifactsDir, "demo-generated.png"), fullPage: true });

  const firstBlobUrl = await getGeneratedFontUrl(page);
  await page.locator("#shift-x").fill("0.45");
  await expect
    .poll(
      async () => {
        const url = await getGeneratedFontUrl(page);
        return Boolean(url && url !== firstBlobUrl);
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  const blobUrl = await getGeneratedFontUrl(page);
  const fontFaceLoads = await page.evaluate(async (blobUrl) => {
    if (!blobUrl) {
      return false;
    }

    const response = await fetch(blobUrl);
    const buffer = await response.arrayBuffer();
    const testUrl = URL.createObjectURL(new Blob([buffer], { type: "font/ttf" }));
    const face = new FontFace("GeneratedSmokeFont", `url(${testUrl}) format("truetype")`);
    await face.load();
    document.fonts.add(face);
    return document.fonts.check('32px "GeneratedSmokeFont"', "ABC 123");
  }, blobUrl);
  expect(fontFaceLoads).toBe(true);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: UI_COPY.controls.downloadTtf }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^PixelPlease-FxtrSans-18-36-0-[A-Z0-9]{4}-Regular\.zip$/);
  await download.saveAs(generatedPackagePath);

  const packageBytes = await fs.readFile(generatedPackagePath);
  const packageEntries = readStoredZip(packageBytes);
  const notice = new TextDecoder().decode(packageEntries["NOTICE.txt"]);
  const [generatedName, generated] = getSingleTtfEntry(packageEntries);
  const parsed = opentype.parse(generated.buffer.slice(generated.byteOffset, generated.byteOffset + generated.byteLength));

  expect(generatedName).toMatch(/^PixelPlease-FxtrSans-18-36-0-[A-Z0-9]{4}-Regular\.ttf$/);
  expect(Object.keys(packageEntries).sort()).toEqual(["NOTICE.txt", generatedName].sort());
  expect(notice).toContain("Fixture Sans");
  expect(notice).toContain("Source license: User-provided; rights not verified by pixelplease.");
  expect(notice).toContain("Generated font naming: PixelPlease + compact source code + effect recipe + short hash + style.");
  expect(notice).toContain("Effect recipe format: cells-per-em-threshold-expand.");
  expect(notice).toContain("compact source codes instead of verbatim source family names");
  expect(parsed.names.fontFamily.en).toMatch(/^PixelPlease FxtrSans 18-36-0 [A-Z0-9]{4}$/);
  expect(parsed.names.fontSubfamily.en).toBe("Regular");
  expect(parsed.names.fullName.en).toBe(`${parsed.names.fontFamily.en} Regular`);
  expect(parsed.names.postScriptName.en).toBe(parsed.names.fullName.en.replaceAll(" ", "-"));
  expect(parsed.names.fontFamily.en).not.toContain("Fixture");
  expect(parsed.names.license.en).toContain("Generated derivative. Source font license controls use");
  expect(parsed.names.licenseURL?.en?.trim() ?? "").toBe("");
  expect(parsed.glyphs.length).toBeGreaterThan(10);
  expect(parsed.charToGlyph("A").advanceWidth).toBeGreaterThan(0);
});

test("handles a real permissive Google Fonts TTF sample", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("radio", { name: UI_COPY.sourceModes.upload }).check();
  await page.locator("#font-upload").setInputFiles(latoSourcePath);
  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });

  await page.locator("#pixels-per-em").fill("22");
  await page.locator("#threshold").fill("42");
  await page.locator("#shift-y").fill("0.3");

  await expect(page.locator("#app-status")).toHaveText(UI_COPY.status.generatedReady, { timeout: 20_000 });
  await page.screenshot({ path: path.join(artifactsDir, "demo-lato-generated.png"), fullPage: true });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: UI_COPY.controls.downloadTtf }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^PixelPlease-Lt-22-42-0-[A-Z0-9]{4}-Regular\.zip$/);
  await download.saveAs(latoGeneratedPackagePath);

  const packageBytes = await fs.readFile(latoGeneratedPackagePath);
  const packageEntries = readStoredZip(packageBytes);
  const notice = new TextDecoder().decode(packageEntries["NOTICE.txt"]);
  const [generatedName, generated] = getSingleTtfEntry(packageEntries);
  const parsed = opentype.parse(generated.buffer.slice(generated.byteOffset, generated.byteOffset + generated.byteLength));

  expect(generatedName).toMatch(/^PixelPlease-Lt-22-42-0-[A-Z0-9]{4}-Regular\.ttf$/);
  expect(notice).toContain("Lato Regular");
  expect(notice).toContain("Lato-Regular.ttf");
  expect(notice).toContain("Source license: User-provided; rights not verified by pixelplease.");
  expect(notice).toContain("Generated font naming: PixelPlease + compact source code + effect recipe + short hash + style.");
  expect(notice).toContain("Effect recipe format: cells-per-em-threshold-expand.");
  expect(parsed.names.fontFamily.en).toMatch(/^PixelPlease Lt 22-42-0 [A-Z0-9]{4}$/);
  expect(parsed.names.fontSubfamily.en).toBe("Regular");
  expect(parsed.names.fullName.en).toBe(`${parsed.names.fontFamily.en} Regular`);
  expect(parsed.names.postScriptName.en).toBe(parsed.names.fullName.en.replaceAll(" ", "-"));
  expect(parsed.names.fontFamily.en).not.toContain("Lato");
  expect(parsed.names.license.en).toContain("Source font license controls use");
  expect(parsed.names.licenseURL?.en?.trim() ?? "").toBe("");
  expect(parsed.charToGlyph("P").advanceWidth).toBeGreaterThan(0);
});

async function getGeneratedFontUrl(page: Page): Promise<string | null> {
  return page.locator("#download-link").getAttribute("data-generated-font-url");
}

function getSingleTtfEntry(entries: Record<string, Uint8Array>): [string, Uint8Array] {
  const names = Object.keys(entries).filter((name) => name.endsWith(".ttf"));
  expect(names).toHaveLength(1);
  return [names[0], entries[names[0]]];
}

async function getInstalledFontGlyphCommandTypes(page: Page, fontFamily: string, character: string): Promise<string[]> {
  const bytes = await page.evaluate(async (family) => {
    const style = document.getElementById(`font-face-${family}`);
    const match = style?.textContent?.match(/url\("([^"]+)"\)/);
    if (!match) {
      throw new Error(`Missing installed font-face for ${family}`);
    }

    const response = await fetch(match[1]);
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  }, fontFamily);
  const data = Uint8Array.from(bytes);
  const font = opentype.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  return font.charToGlyph(character).path.commands.map((command) => command.type);
}

type LogoHeadingMetrics = {
  logoFontSize: string;
  logoLineHeight: string;
  faqFontSize: string;
  faqLineHeight: string;
};

async function getLogoHeadingMetrics(page: Page): Promise<LogoHeadingMetrics> {
  return page.evaluate(() => {
    const logo = document.querySelector("#logo-title");
    const faqHeading = document.querySelector("#faq-heading");
    if (!logo || !faqHeading) {
      throw new Error("Missing logo or FAQ heading");
    }

    const logoStyles = getComputedStyle(logo);
    const faqStyles = getComputedStyle(faqHeading);
    return {
      logoFontSize: logoStyles.fontSize,
      logoLineHeight: logoStyles.lineHeight,
      faqFontSize: faqStyles.fontSize,
      faqLineHeight: faqStyles.lineHeight,
    };
  });
}

type CanvasSignature = {
  width: number;
  height: number;
  darkSamples: number;
  hash: number;
};

async function expectPixelCanvasHasInk(page: Page): Promise<CanvasSignature> {
  const signature = await getPixelCanvasSignature(page);
  expect(signature.width).toBeGreaterThan(0);
  expect(signature.height).toBeGreaterThan(0);
  expect(signature.darkSamples).toBeGreaterThan(12);
  return signature;
}

async function getPixelCanvasSignature(page: Page): Promise<CanvasSignature> {
  return page.locator("#demo-preview-canvas").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const context = element.getContext("2d");
    if (!context) {
      throw new Error("Missing preview canvas context");
    }

    const { data, width, height } = context.getImageData(0, 0, element.width, element.height);
    let darkSamples = 0;
    let hash = 2166136261;
    const stride = 4;

    for (let index = 0; index < data.length; index += stride) {
      const red = data[index] ?? 255;
      const green = data[index + 1] ?? 255;
      const blue = data[index + 2] ?? 255;
      if (red < 128 && green < 128 && blue < 128) {
        darkSamples += 1;
      }
      hash ^= red + green * 3 + blue * 7 + index;
      hash = Math.imul(hash, 16777619) >>> 0;
    }

    return { width, height, darkSamples, hash };
  });
}

type CanvasLayoutMetrics = {
  cssWidth: number;
  backingCssWidth: number;
  frameClientHeight: number;
  frameScrollHeight: number;
  canvasCssHeight: number;
  bottomDarkSamples: number;
};

type CanvasTypographySyncMetrics = {
  frameWidth: number;
  renderFontSize: number;
  fontSizeDelta: number;
  lineHeightDelta: number;
  paddingLeftDelta: number;
  paddingTopDelta: number;
  canvasWidthDelta: number;
};

type ControlsSpacingMetrics = {
  actionGap: number;
  controlGap: string;
};

type PanelLayoutMetrics = {
  gridColumnCount: number;
  shellPaddingLeft: number;
  shellPaddingRight: number;
  workspaceLeftInset: number;
  workspaceRightInset: number;
  sourceOutputHeightDelta: number;
  sourceControlsHeightDelta: number;
  actionGap: number;
  actionOverflow: number;
};

async function getPanelLayoutMetrics(page: Page): Promise<PanelLayoutMetrics> {
  return page.locator(".workspace").evaluate((workspace) => {
    const shell = document.querySelector(".app-shell");
    const sourcePreview = document.querySelector("#source-editor-field");
    const outputPreview = document.querySelector("#demo-preview-frame");
    const controlsPanel = document.querySelector(".controls-panel");
    const controlStack = document.querySelector(".control-stack");
    const actionStack = document.querySelector(".action-stack");
    if (!shell || !sourcePreview || !outputPreview || !controlsPanel || !controlStack || !actionStack) {
      throw new Error("Missing panel layout elements");
    }

    const shellBox = shell.getBoundingClientRect();
    const workspaceBox = workspace.getBoundingClientRect();
    const sourceBox = sourcePreview.getBoundingClientRect();
    const outputBox = outputPreview.getBoundingClientRect();
    const controlsBox = controlsPanel.getBoundingClientRect();
    const controlBox = controlStack.getBoundingClientRect();
    const actionBox = actionStack.getBoundingClientRect();
    const shellStyles = getComputedStyle(shell);
    const workspaceStyles = getComputedStyle(workspace);

    return {
      gridColumnCount: workspaceStyles.gridTemplateColumns.split(" ").length,
      shellPaddingLeft: Number.parseFloat(shellStyles.paddingLeft),
      shellPaddingRight: Number.parseFloat(shellStyles.paddingRight),
      workspaceLeftInset: workspaceBox.left - shellBox.left,
      workspaceRightInset: shellBox.right - workspaceBox.right,
      sourceOutputHeightDelta: Math.abs(sourceBox.height - outputBox.height),
      sourceControlsHeightDelta: Math.abs(sourceBox.height - controlsBox.height),
      actionGap: actionBox.top - controlBox.bottom,
      actionOverflow: Math.max(0, actionBox.bottom - controlsBox.bottom),
    };
  });
}

async function getControlsSpacingMetrics(page: Page): Promise<ControlsSpacingMetrics> {
  return page.locator(".controls-panel").evaluate((panel) => {
    const controlStack = panel.querySelector(".control-stack");
    const actionStack = panel.querySelector(".action-stack");
    if (!(controlStack instanceof HTMLElement) || !(actionStack instanceof HTMLElement)) {
      throw new Error("Missing control/action stack");
    }

    const controlBox = controlStack.getBoundingClientRect();
    const actionBox = actionStack.getBoundingClientRect();

    return {
      actionGap: actionBox.top - controlBox.bottom,
      controlGap: getComputedStyle(controlStack).rowGap,
    };
  });
}

async function expectCanvasTypographySynced(page: Page): Promise<CanvasTypographySyncMetrics> {
  await expect
    .poll(
      async () => {
        const metrics = await getCanvasTypographySyncMetrics(page);
        return (
          metrics.fontSizeDelta < 0.01 &&
          metrics.lineHeightDelta < 0.01 &&
          metrics.paddingLeftDelta < 0.01 &&
          metrics.paddingTopDelta < 0.01 &&
          metrics.canvasWidthDelta < 1
        );
      },
      { timeout: 5_000 },
    )
    .toBe(true);

  return getCanvasTypographySyncMetrics(page);
}

async function getCanvasTypographySyncMetrics(page: Page): Promise<CanvasTypographySyncMetrics> {
  return page.locator("#sample-text").evaluate((source) => {
    const sourceElement = source as HTMLTextAreaElement;
    const frame = document.querySelector("#demo-preview-frame");
    const canvas = document.querySelector("#demo-preview-canvas");
    if (!(frame instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Missing canvas preview elements");
    }

    const dpr = window.devicePixelRatio || 1;
    const sourceStyles = getComputedStyle(sourceElement);
    const sourceFontSize = Number.parseFloat(sourceStyles.fontSize);
    const sourceLineHeight = Number.parseFloat(sourceStyles.lineHeight);
    const sourcePaddingLeft = Number.parseFloat(sourceStyles.paddingLeft);
    const sourcePaddingTop = Number.parseFloat(sourceStyles.paddingTop);
    const renderFontSize = Number(canvas.dataset.renderFontSize);
    const renderLineHeight = Number(canvas.dataset.renderLineHeight);
    const renderPaddingLeft = Number(canvas.dataset.renderPaddingLeft);
    const renderPaddingTop = Number(canvas.dataset.renderPaddingTop);
    const backingCssWidth = canvas.width / dpr;

    return {
      frameWidth: frame.clientWidth,
      renderFontSize,
      fontSizeDelta: Math.abs(sourceFontSize - renderFontSize),
      lineHeightDelta: Math.abs(sourceLineHeight - renderLineHeight),
      paddingLeftDelta: Math.abs(sourcePaddingLeft - renderPaddingLeft),
      paddingTopDelta: Math.abs(sourcePaddingTop - renderPaddingTop),
      canvasWidthDelta: Math.abs(frame.clientWidth - backingCssWidth),
    };
  });
}

async function getPixelCanvasLayoutMetrics(page: Page): Promise<CanvasLayoutMetrics> {
  return page.locator("#demo-preview-canvas").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const frame = document.querySelector("#demo-preview-scroll");
    const rect = element.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const context = element.getContext("2d");
    if (!context || !(frame instanceof HTMLElement)) {
      throw new Error("Missing preview canvas context or frame");
    }

    const { data, width, height } = context.getImageData(0, 0, element.width, element.height);
    const lowerStart = Math.max(0, height - Math.round(90 * dpr));
    let bottomDarkSamples = 0;

    for (let y = lowerStart; y < height; y += Math.max(1, Math.round(2 * dpr))) {
      for (let x = 0; x < width; x += Math.max(1, Math.round(2 * dpr))) {
        const index = (y * width + x) * 4;
        const red = data[index] ?? 255;
        const green = data[index + 1] ?? 255;
        const blue = data[index + 2] ?? 255;
        if (red < 128 && green < 128 && blue < 128) {
          bottomDarkSamples += 1;
        }
      }
    }

    return {
      cssWidth: rect.width,
      backingCssWidth: element.width / dpr,
      frameClientHeight: frame.clientHeight,
      frameScrollHeight: frame.scrollHeight,
      canvasCssHeight: rect.height,
      bottomDarkSamples,
    };
  });
}

function readStoredZip(data: Uint8Array): Record<string, Uint8Array> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const entries: Record<string, Uint8Array> = {};
  let offset = 0;

  while (view.getUint32(offset, true) === 0x04034b50) {
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = new TextDecoder().decode(data.subarray(nameStart, nameStart + nameLength));
    entries[name] = data.subarray(dataStart, dataStart + compressedSize);
    offset = dataStart + compressedSize;
  }

  return entries;
}

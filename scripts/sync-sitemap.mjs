import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sitemapPath = path.join(rootDir, "public", "sitemap.xml");

const lastmod = process.env.PIXELPLEASE_SITEMAP_LASTMOD ?? new Date().toISOString().slice(0, 10);

if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) {
  throw new Error(`PIXELPLEASE_SITEMAP_LASTMOD must use YYYY-MM-DD; received ${lastmod}.`);
}

const urls = [
  { loc: "https://pixelplease.tools/", changefreq: "weekly", priority: "1.0" },
  { loc: "https://pixelplease.tools/how-to-make-a-pixel-font/", changefreq: "monthly", priority: "0.8" },
  { loc: "https://pixelplease.tools/convert-ttf-to-pixel-font/", changefreq: "monthly", priority: "0.8" },
  { loc: "https://pixelplease.tools/pixel-merriweather/", changefreq: "monthly", priority: "0.7" },
  { loc: "https://pixelplease.tools/pixel-inter/", changefreq: "monthly", priority: "0.7" },
];

const body = urls
  .map(
    ({ loc, changefreq, priority }) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

await writeFile(sitemapPath, xml);
console.log(`Sitemap synced: ${path.relative(rootDir, sitemapPath)} lastmod=${lastmod}`);

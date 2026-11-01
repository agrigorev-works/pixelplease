import {guides,guideDate,origin} from './data/pixel-guides.mjs';
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sitemapPath = path.join(rootDir, "public", "sitemap.xml");

const lastmod = process.env.PIXELPLEASE_SITEMAP_LASTMOD ?? guideDate;

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

const existing=await readFile(sitemapPath,'utf8');
const oldDates=new Map([...existing.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m=>[m[1].match(/<loc>(.*?)<\/loc>/)?.[1],m[1].match(/<lastmod>(.*?)<\/lastmod>/)?.[1]]));
for(const g of guides)if(!urls.some(p=>p.loc===`${origin}/${g.slug}/`))urls.push({loc:`${origin}/${g.slug}/`,changefreq:'monthly',priority:'0.8'});
// Content dates, not the build clock. Preserve existing family-example dates.
const modificationDate=loc=>loc===`${origin}/`?(process.env.PIXELPLEASE_SITEMAP_LASTMOD ?? "2026-11-01"):loc.endsWith('/pixel-inter/')||loc.endsWith('/pixel-merriweather/')?oldDates.get(loc)||'2026-07-12':lastmod;
const body = urls
  .map(
    ({ loc, changefreq, priority }) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${modificationDate(loc)}</lastmod>
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

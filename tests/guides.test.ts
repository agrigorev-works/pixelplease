import {expect,it} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
const slugs=['how-to-make-a-pixel-font','convert-ttf-to-pixel-font','what-is-a-pixel-font','google-fonts-to-pixel-font','fix-blurry-pixel-font','install-pixel-font','use-pixel-font-in-figma','pixel-font-commercial-use','use-pixel-font-on-website','pixel-font-for-games'];
const read=(p:string)=>readFileSync(p,'utf8');
it('publishes ten distinct static answers with canonical metadata, sources and real app CTAs',()=>{
 const titles=new Set(),descriptions=new Set();
 for(const slug of slugs){
  const file=`public/${slug}/index.html`;expect(existsSync(file),slug).toBe(true);const html=read(file);
  expect((html.match(/<h1\b/g)||[]).length).toBe(1);
  const title=html.match(/<title>(.*?)<\/title>/s)?.[1],desc=html.match(/name="description"\s+content="([^"]+)"/)?.[1];
  expect(title).toBeTruthy();expect(desc).toBeTruthy();expect(titles.has(title)).toBe(false);expect(descriptions.has(desc)).toBe(false);titles.add(title);descriptions.add(desc);
  expect(html).toContain(`rel="canonical" href="https://pixelplease.tools/${slug}/"`);
  expect(html).toContain('index, follow');expect(html).not.toContain('/src/main.ts');
  expect(html).toContain('class="guide-cta" href="/"');
  const graph=JSON.parse(html.match(/type="application\/ld\+json">(.*?)<\/script>/s)![1])['@graph'];
  expect(graph.some((n:any)=>n['@type']==='Article')).toBe(true);
  expect(graph.some((n:any)=>n['@type']==='BreadcrumbList')).toBe(true);
  expect(html).toContain('aria-label="Sources"');expect(html).toContain('Basic Latin');
 }
});
it('exposes all ten guide links in static footers on the app and every public article',()=>{
 for(const file of ['index.html',...slugs.map(s=>`public/${s}/index.html`),'public/pixel-inter/index.html','public/pixel-merriweather/index.html']){
  const html=read(file);const footer=html.match(/<!-- pixel-guides:start -->([\s\S]*?)<!-- pixel-guides:end -->/)?.[1];expect(footer,file).toBeTruthy();
  for(const s of slugs)expect(footer).toContain(`href="/${s}/"`);
 }
});
it('keeps article local links resolvable and contains no unresolved placeholders',()=>{
 for(const s of slugs){const html=read(`public/${s}/index.html`);
  for(const [,href] of html.matchAll(/href="(\/[^"#]*)(?:#[^"]*)?"/g)){
   const p=href.split('?')[0];expect(existsSync(p==='/'?'index.html':`public${p}${p.endsWith('/')?'index.html':''}`),href).toBe(true);
  }
  expect(html).not.toMatch(/TODO|PLACEHOLDER|lorem ipsum/i);
 }
});
it('lists only thirteen canonical pages in discovery, including ten guides',()=>{
 const xml=read('public/sitemap.xml'),urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);expect(new Set(urls).size).toBe(13);expect(urls).toHaveLength(13);
 for(const s of slugs){const url=`https://pixelplease.tools/${s}/`;expect(urls).toContain(url);for(const f of ['public/llms.txt','public/llms-full.txt'])expect(read(f)).toContain(url);}
 expect(read('public/robots.txt')).toContain('Sitemap: https://pixelplease.tools/sitemap.xml');
});

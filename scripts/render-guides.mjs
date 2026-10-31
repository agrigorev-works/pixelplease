import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {guides,sources,origin,guideDate} from './data/pixel-guides.mjs';
const root=new URL('../',import.meta.url),esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const css='<link rel="stylesheet" href="/guides.css?v=20261031-3">';
const footer=`<!-- pixel-guides:start --><footer class="guide-footer"><nav aria-label="Pixel font guides"><h2>Pixel font guides</h2><ul>${guides.map(g=>`<li><a href="/${g.slug}/">${esc(g.question)}</a></li>`).join('')}</ul></nav></footer><!-- pixel-guides:end -->`;
for(const g of guides){
 const url=`${origin}/${g.slug}/`,image=`${origin}/og-image-20260623.png`;
 const sections=g.sections.map((s,i)=>({...s,id:`step-${i+1}`}));
 const graph={'@context':'https://schema.org','@graph':[{'@type':'Article',headline:g.question,description:g.description,url,mainEntityOfPage:url,image,...(g.slug==='how-to-make-a-pixel-font'||g.slug==='convert-ttf-to-pixel-font'?{}:{datePublished:guideDate}),dateModified:guideDate,inLanguage:'en',publisher:{'@type':'Organization',name:'pixelplease',url:origin+'/'}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'pixelplease',item:origin+'/'},{'@type':'ListItem',position:2,name:g.question,item:url}]}]};
 const html=`<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(g.title)}</title><meta name="description" content="${esc(g.description)}"><meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:site_name" content="pixelplease"><meta property="og:title" content="${esc(g.title)}"><meta property="og:description" content="${esc(g.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="pixelplease — browser-based pixel font generator">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(g.title)}"><meta name="twitter:description" content="${esc(g.description)}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="pixelplease — browser-based pixel font generator">
<link rel="icon" href="/favicon.ico">${css}<script type="application/ld+json">${JSON.stringify(graph).replaceAll('<','\\u003c')}</script></head>
<body class="pixel-guide-page"><main class="pixel-guide">
<nav class="guide-breadcrumb" aria-label="Breadcrumb"><a href="/">pixelplease</a><span aria-hidden="true">/</span><span aria-current="page">${esc(g.question)}</span></nav>
<h1>${esc(g.question)}</h1><p class="guide-lead">${esc(g.lead)}</p><p class="guide-meta">Published by <a href="/">pixelplease</a> · Updated <time datetime="${guideDate}">31 October 2026</time></p>
<a class="guide-cta" href="/">Make a pixel font</a>
<nav class="guide-toc" aria-label="On this page"><h2>On this page</h2><ul>${sections.map(s=>`<li><a href="#${s.id}">${esc(s.heading)}</a></li>`).join('')}</ul></nav>
${sections.map(s=>`<section id="${s.id}" aria-labelledby="${s.id}-title"><h2 id="${s.id}-title">${esc(s.heading)}</h2>${s.html}</section>`).join('\n')}
<a class="guide-cta" href="/">Make a pixel font</a>
<nav class="guide-related" aria-label="Related guides"><h2>Keep exploring</h2><ul>${g.related.map(slug=>{const r=guides.find(x=>x.slug===slug);if(!r)throw Error('Unknown guide '+slug);return `<li><a href="/${slug}/">${esc(r.question)}</a></li>`;}).join('')}</ul></nav>
<nav class="guide-sources" aria-label="Sources"><h2>Sources and product reference</h2><ul>${g.sources.map(id=>{const s=sources[id];if(!s)throw Error('Unknown source '+id);return `<li><a href="${s.url}">${esc(s.label)}</a></li>`;}).join('')}</ul><p class="guide-note">AI-assisted editorial guidance checked against the linked documentation and pixelplease’s current features. Sample text and code are illustrative. Refer to the original documentation for platform changes and to the source font license for its terms.</p></nav>
</main>${footer}</body></html>\n`;
 const dir=new URL(`public/${g.slug}/`,root);await mkdir(dir,{recursive:true});await writeFile(new URL('index.html',dir),html);
}
// Preserve the working app and family examples; only add the shared, crawlable footer/CSS.
for(const file of ['index.html','public/pixel-inter/index.html','public/pixel-merriweather/index.html']){
 const path=new URL(file,root);let html=await readFile(path,'utf8');
 if(file!=='index.html')html=html.replace('<body>','<body class="pixel-example">');
 if(html.includes('<!-- pixel-guides:start -->'))html=html.replace(/<!-- pixel-guides:start -->[\s\S]*?<!-- pixel-guides:end -->/,footer);
 else if(file==='index.html')html=html.replace('    <footer class="creator-footer"',footer+'\n    <footer class="creator-footer"');
 else html=html.replace('</body>',footer+'\n</body>');
 if(html.includes('href="/guides.css'))html=html.replace(/<link rel="stylesheet" href="\/guides\.css[^\"]*">/,css);else html=html.replace('</head>',css+'\n</head>');
 await writeFile(path,html);
}
const catalogue='## Pixel font guides\n\nPractical, source-backed answers. These guides describe the current Basic Latin TTF workflow, not a bitmap atlas or WOFF2 exporter.\n\n'+guides.map(g=>`- [${g.question}](${origin}/${g.slug}/): ${g.description}`).join('\n');
for(const file of ['public/llms.txt','public/llms-full.txt']){
 const path=new URL(file,root),text=await readFile(path,'utf8');await writeFile(path,text.replace(/\n## Pixel font guides\n[\s\S]*?(?=\n## |$)/,'').trimEnd()+'\n\n'+catalogue+'\n');
}
console.log(`Rendered ${guides.length} guides; updated 13 footers and LLM discovery.`);

import {expect,test} from '@playwright/test';
const slugs=['how-to-make-a-pixel-font','convert-ttf-to-pixel-font','what-is-a-pixel-font','google-fonts-to-pixel-font','fix-blurry-pixel-font','install-pixel-font','use-pixel-font-in-figma','pixel-font-commercial-use','use-pixel-font-on-website','pixel-font-for-games'];
for(const width of [1440,390,320])test(`all guides readable without JavaScript at ${width}px`,async({browser,baseURL})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900}});const page=await context.newPage();
 for(const slug of slugs){
  const response=await page.goto(`${baseURL}/${slug}/`);expect(response?.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();await expect(page.locator('.guide-cta')).toHaveCount(2);
  await expect(page.locator('.guide-footer a')).toHaveCount(10);
  expect(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.locator('main').evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Mono');
  expect(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
  await page.locator('.guide-toc a').first().click();await expect(page).toHaveURL(/#step-1$/);
  await page.locator('.guide-footer a').first().click();await expect(page.locator('h1')).toHaveText('How do I make a pixel font?');
 }
 for(const path of ['/','/pixel-inter/','/pixel-merriweather/']){await page.goto(`${baseURL}${path}`);await expect(page.locator('.guide-footer a')).toHaveCount(10);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);}
 await context.close();
});
test('guide CTA opens the functioning font generator',async({page})=>{
 await page.goto('/use-pixel-font-in-figma/');await page.locator('.guide-cta').first().click();
 await expect(page).toHaveURL(/\/$/);await expect(page.locator('#app-status')).toHaveText('Generated TTF ready',{timeout:20000});await expect(page.locator('#download-link')).not.toHaveClass(/is-disabled/);
 await expect(page.locator('.guide-footer a')).toHaveCount(10);
});

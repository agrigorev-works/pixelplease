import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(rootDir, "public", "og-image.png");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});

await page.setContent(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        color-scheme: light;
        font-family: "SF Mono", "Roboto Mono", ui-monospace, monospace;
        background: #f7f7f2;
        color: #151515;
      }

      * {
        box-sizing: border-box;
      }

      body {
        width: 1200px;
        height: 630px;
        margin: 0;
        overflow: hidden;
        background:
          linear-gradient(#e8e6dc 1px, transparent 1px),
          linear-gradient(90deg, #e8e6dc 1px, transparent 1px),
          #f7f7f2;
        background-size: 24px 24px;
      }

      .frame {
        position: relative;
        width: 100%;
        height: 100%;
        padding: 66px 74px;
      }

      .brand {
        display: flex;
        align-items: baseline;
        gap: 26px;
      }

      h1 {
        margin: 0;
        font-family: Impact, Haettenschweiler, "Arial Black", sans-serif;
        font-size: 112px;
        line-height: 0.86;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: lowercase;
      }

      .descriptor {
        max-width: 330px;
        font-size: 24px;
        line-height: 1.22;
        font-weight: 700;
      }

      .product {
        position: absolute;
        left: 74px;
        right: 74px;
        bottom: 66px;
        display: grid;
        grid-template-columns: 1fr 96px 1fr 230px;
        gap: 22px;
        align-items: stretch;
      }

      .panel,
      .controls {
        min-height: 250px;
        border: 3px solid #151515;
        background: #fffef8;
        box-shadow: 10px 10px 0 #151515;
        padding: 24px;
      }

      .label {
        margin: 0 0 22px;
        color: #4b4b4b;
        font-size: 20px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .source-text {
        font-family: Georgia, "Times New Roman", serif;
        font-size: 44px;
        line-height: 1.14;
        font-weight: 700;
      }

      .pixel-text {
        display: grid;
        gap: 10px;
        font-size: 0;
      }

      .pixel-row {
        display: flex;
        gap: 8px;
      }

      .pixel {
        width: 20px;
        height: 20px;
        background: #151515;
      }

      .pixel.alt {
        background: #0b61ff;
      }

      .arrow {
        display: grid;
        place-items: center;
        color: #151515;
        font-size: 76px;
        font-weight: 900;
      }

      .controls {
        box-shadow: none;
        background: #e7f2ff;
      }

      .slider {
        height: 16px;
        margin: 26px 0;
        background: linear-gradient(90deg, #151515 0 58%, #fffef8 58%);
        border: 3px solid #151515;
      }

      .button {
        margin-top: 36px;
        padding: 16px 18px;
        background: #c8ff5d;
        border: 3px solid #151515;
        font-size: 20px;
        font-weight: 900;
        text-align: center;
        text-transform: uppercase;
      }

      .privacy {
        position: absolute;
        left: 74px;
        bottom: 26px;
        font-size: 18px;
        font-weight: 700;
        color: #4b4b4b;
      }
    </style>
  </head>
  <body>
    <main class="frame">
      <div class="brand">
        <h1>pixelplease</h1>
        <div class="descriptor">browser-based pixel font generator</div>
      </div>

      <section class="product" aria-label="Product preview">
        <div class="panel">
          <p class="label">Source</p>
          <div class="source-text">Turn type into pixels</div>
        </div>

        <div class="arrow">→</div>

        <div class="panel">
          <p class="label">Pixel Output</p>
          <div class="pixel-text" aria-hidden="true">
            <div class="pixel-row">
              <span class="pixel"></span><span class="pixel"></span><span class="pixel"></span><span class="pixel alt"></span><span class="pixel"></span><span class="pixel"></span><span class="pixel"></span><span class="pixel"></span><span class="pixel alt"></span>
            </div>
            <div class="pixel-row">
              <span class="pixel"></span><span class="pixel alt"></span><span class="pixel"></span><span class="pixel"></span><span class="pixel"></span><span class="pixel alt"></span><span class="pixel"></span><span class="pixel"></span>
            </div>
            <div class="pixel-row">
              <span class="pixel"></span><span class="pixel"></span><span class="pixel"></span><span class="pixel"></span><span class="pixel alt"></span><span class="pixel"></span><span class="pixel"></span><span class="pixel"></span><span class="pixel"></span>
            </div>
            <div class="pixel-row">
              <span class="pixel alt"></span><span class="pixel"></span><span class="pixel"></span><span class="pixel"></span><span class="pixel"></span><span class="pixel"></span><span class="pixel alt"></span>
            </div>
          </div>
        </div>

        <div class="controls">
          <p class="label">Tune</p>
          <div class="slider"></div>
          <div class="slider"></div>
          <div class="button">Export TTF</div>
        </div>
      </section>

      <div class="privacy">Local font processing · preview, tune, export</div>
    </main>
  </body>
</html>`);

await page.screenshot({ path: outputPath, type: "png" });
await browser.close();

console.log(`Wrote ${outputPath}`);

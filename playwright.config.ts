import { defineConfig } from "@playwright/test";

const previewPort = process.env.PIXELPLEASE_PREVIEW_PORT ?? "4173";
const previewUrl = `http://127.0.0.1:${previewPort}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts/,
  testIgnore: /launch-sanity\.spec\.ts/,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: previewUrl,
    viewport: { width: 1360, height: 900 },
  },
  webServer: {
    command: `npm run preview -- --port ${previewPort}`,
    url: previewUrl,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

import { defineConfig, devices } from "@playwright/test";

const previewPort = process.env.PIXELPLEASE_PREVIEW_PORT ?? "4173";
const previewUrl = `http://127.0.0.1:${previewPort}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: /launch-sanity\.spec\.ts/,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: previewUrl,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: `npm run preview -- --port ${previewPort}`,
    url: previewUrl,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

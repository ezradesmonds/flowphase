import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "ui.spec.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    channel: "chromium",
    viewport: { width: 1440, height: 1050 },
  },
  webServer: {
    command: "npm run dev -- --port 3100",
    env: { FLOWPHASE_MODE: "demo" },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
  },
});

const { defineConfig, devices } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:3000",
    locale: "es-MX",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : {},
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        launchOptions: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE }
          : {},
      },
    },
  ],
  webServer: {
    command: "node tests/server.cjs",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
  },
});

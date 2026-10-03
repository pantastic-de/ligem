import { defineConfig, devices } from "@playwright/test";

// Story tests ("Geschichten", see docs/stories/README.md): each test plays one
// story from docs/stories/ through the real UI against the running dev stack
// (`docker compose up`). Run from apps/web on the host:
//
//   npx playwright test            # all stories
//   npx playwright test --headed   # watch the browser
//   npx playwright show-report     # last HTML report
//
// The stories share one database, so they run one after another (workers: 1).
// e2e/global-setup.ts creates the test accounts and projects (all on
// .invalid addresses, so no real mail can go out), global-teardown.ts
// removes them again.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "e2e/.report", open: "never" }]],
  outputDir: "e2e/.results",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "de-DE",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

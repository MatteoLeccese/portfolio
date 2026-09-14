import { defineConfig, devices } from "@playwright/test";

// The single port of the project (§4). It is declared once in package.json's
// start script, so the command below must NOT pass --port again.
const BASE_URL = "http://127.0.0.1:3200";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  retries: process.env.CI !== undefined ? 1 : 0,
  workers: process.env.CI !== undefined ? 2 : undefined,
  reporter: process.env.CI !== undefined
    ? [ [ "github" ], [ "html", { open: "never" } ] ]
    : [ [ "list" ] ],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices[ "Desktop Chrome" ] },
      testMatch: [ "a11y.spec.ts", "cookies.spec.ts", "contact.spec.ts", "seo.spec.ts", "theme-locale.spec.ts" ],
    },
    {
      // The mobile project exists for the suites whose subject only exists on a phone
      // viewport: the Sheet navigation, the mobile axe scans, and the motion spec, which
      // pins 390x844 with test.use of its own.
      name: "mobile",
      use: { ...devices[ "Pixel 7" ] },
      testMatch: [ "a11y.spec.ts", "keyboard.spec.ts", "motion.spec.ts" ],
    },
  ],
  webServer: {
    // This config file is the single source of truth for the E2E environment:
    // the CI job declares no env vars of its own.
    command: "npm run build && npm run start",
    url: BASE_URL,
    reuseExistingServer: process.env.CI === undefined,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_SITE_URL: BASE_URL,
      // Empty on purpose: the contact action logs the payload to stdout instead of
      // calling Resend. See §10.
      RESEND_API_KEY: "",
      CONTACT_TO_EMAIL: "dev@localhost",
      CONTACT_FROM_EMAIL: "dev@localhost",
      // E2E only. It lets contact.spec.ts forge one client address per test so the
      // 3-per-hour bucket of 10.5 never couples two tests. Production leaves it unset.
      TRUST_PROXY: "1",
      RATE_LIMIT_SALT: "e2e-not-a-secret",
    },
  },
});

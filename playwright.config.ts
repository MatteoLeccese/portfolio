import { defineConfig, devices } from "@playwright/test";

// The single port of the project. The start script in package.json already sets it, so the
// webServer command below must not pass --port again.
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
      // Suites whose subject only exists on a phone viewport: the Sheet navigation, the
      // mobile axe scans, and the motion spec, which pins 390x844 with its own test.use.
      name: "mobile",
      use: { ...devices[ "Pixel 7" ] },
      testMatch: [ "a11y.spec.ts", "keyboard.spec.ts", "motion.spec.ts" ],
    },
  ],
  webServer: {
    // Single source of truth for the E2E environment: the CI job declares no env vars.
    command: "npm run build && npm run start",
    url: BASE_URL,
    reuseExistingServer: process.env.CI === undefined,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_SITE_URL: BASE_URL,
      // Empty on purpose: the contact action logs the payload to stdout instead of
      // calling Resend.
      RESEND_API_KEY: "",
      CONTACT_TO_EMAIL: "dev@localhost",
      CONTACT_FROM_EMAIL: "dev@localhost",
      // E2E only: lets contact.spec.ts set one client address per test, so the per-hour
      // rate-limit bucket never couples two tests. Production leaves it unset.
      TRUST_PROXY: "1",
      RATE_LIMIT_SALT: "e2e-not-a-secret",
    },
  },
});

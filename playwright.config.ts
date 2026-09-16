import { defineConfig, devices } from "@playwright/test";

// The single port of the project. The start script in package.json already sets it, so the
// webServer command below must not pass --port again.
const BASE_URL = "http://127.0.0.1:3200";

// The second origin of the run: the same application built with the contact form switched on.
// NEXT_PUBLIC_USE_RESEND_EMAIL_FORM is inlined at build time, so each contact path needs its
// own build and its own server.
const CONTACT_FORM_URL = "http://127.0.0.1:3201";

const CONTACT_FORM_PORT = "3201";

// Application directory of the form build: its own .next beside links to the sources.
// Building it writes nothing into the .next the default server runs from.
const CONTACT_FORM_DIR = ".e2e-contact-form";

const CONTACT_FORM_LINKS = [ "node_modules", "public", "src", "messages" ].join(" ");

const CONTACT_FORM_COMMAND = [
  `rm -rf ${CONTACT_FORM_DIR}`,
  `mkdir -p ${CONTACT_FORM_DIR}`,
  `for entry in ${CONTACT_FORM_LINKS}; do ln -s "../$entry" "${CONTACT_FORM_DIR}/$entry"; done`,
  `cp next.config.ts package.json tsconfig.json ${CONTACT_FORM_DIR}/`,
  `npx next build ${CONTACT_FORM_DIR}`,
  `npx next start ${CONTACT_FORM_DIR} --port ${CONTACT_FORM_PORT}`,
].join(" && ");

// Everything the contact action needs at runtime. RESEND_API_KEY is empty on purpose: the
// mailer logs the message to stdout instead of calling Resend.
const CONTACT_ENV = {
  RESEND_API_KEY: "",
  CONTACT_TO_EMAIL: "dev@localhost",
  CONTACT_FROM_EMAIL: "dev@localhost",

  // E2E only: lets contact.spec.ts set one client address per test, so the per-hour
  // rate-limit bucket never couples two tests. Production leaves it unset.
  TRUST_PROXY: "1",
  RATE_LIMIT_SALT: "e2e-not-a-secret",
};

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
    {
      // The build that renders the contact form. contact.spec.ts holds both contact paths
      // and reads the project name: the form group runs here and the mailto group on
      // desktop, where the default build renders no form at all.
      name: "desktop-contact-form",
      use: { ...devices[ "Desktop Chrome" ], baseURL: CONTACT_FORM_URL },
      testMatch: [ "contact.spec.ts" ],
    },
  ],
  webServer: [
    {
      // Single source of truth for the E2E environment: every variable the build and the run
      // need is declared here and nowhere else.
      command: "npm run build && npm run start",
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        NEXT_PUBLIC_SITE_URL: BASE_URL,
        ...CONTACT_ENV,
      },
    },
    {
      command: CONTACT_FORM_COMMAND,
      url: CONTACT_FORM_URL,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        NEXT_PUBLIC_SITE_URL: CONTACT_FORM_URL,
        NEXT_PUBLIC_USE_RESEND_EMAIL_FORM: "true",
        ...CONTACT_ENV,
      },
    },
  ],
});

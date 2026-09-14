import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the "@/*" alias declared in tsconfig.json.
  plugins: [ tsconfigPaths() ],
  test: {
    // Node environment: nothing under test touches the DOM.
    environment: "node",
    // Unit tests are *.test.ts under src/. Playwright specs live in tests/e2e and are
    // outside this glob.
    include: [ "src/**/*.test.ts" ],
    restoreMocks: true,
    reporters: process.env.CI === undefined ? [ "default" ] : [ "default", "github-actions" ],
  },
});

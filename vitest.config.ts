import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the "@/*" alias from tsconfig.json. Without this plugin no test that
  // imports the "@/" alias can even load.
  plugins: [ tsconfigPaths() ],
  test: {
    // Node, not jsdom: nothing under test touches the DOM (see 12.3).
    environment: "node",
    // Unit tests are *.test.ts inside src/. Playwright specs are tests/e2e/*.spec.ts
    // and must never be picked up by Vitest.
    include: [ "src/**/*.test.ts" ],
    restoreMocks: true,
    reporters: process.env.CI === undefined ? [ "default" ] : [ "default", "github-actions" ],
  },
});

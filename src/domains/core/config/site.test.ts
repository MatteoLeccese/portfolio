// src/domains/core/config/site.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

import type * as Site from "@/domains/core/config/site";

/**
 * site.ts reads its variables once, at module load, so every case here loads a fresh copy
 * of the module with its own environment. No assertion repeats an identity value as a
 * literal: what is asserted is that the module publishes what the environment holds.
 */

type SiteModule = typeof Site;

const ORIGINAL_ENV = { ...process.env };

/** The variables a production build needs before any other case adds to them. */
const PRODUCTION = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://example.com",
  NEXT_PUBLIC_SITE_EMAIL: "owner@example.com",
};

/** The variables this suite writes. Every one is put back after each case. */
const MANAGED: readonly string[] = [
  "NODE_ENV",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SITE_EMAIL",
  "NEXT_PUBLIC_SITE_GITHUB_URL",
  "NEXT_PUBLIC_SITE_LINKEDIN_URL",
  "NEXT_PUBLIC_USE_RESEND_EMAIL_FORM",
];

/** Sets one variable, or deletes it when `value` is undefined. */
function setEnv (key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[ key ];
  else process.env[ key ] = value;
}

/** Puts every managed variable back to the value the suite started with. */
function restoreEnv (): void {
  for (const key of MANAGED) setEnv(key, ORIGINAL_ENV[ key ]);
}

/** Loads the module with `env` applied on top of the environment the suite started in. */
async function loadSite (env: Record<string, string | undefined>): Promise<SiteModule> {
  restoreEnv();
  for (const [ key, value ] of Object.entries(env)) setEnv(key, value);
  vi.resetModules();

  return await import("@/domains/core/config/site");
}

afterEach(restoreEnv);

describe("SITE.email", () => {
  it("is the address NEXT_PUBLIC_SITE_EMAIL holds", async () => {
    const { SITE } = await loadSite({ NEXT_PUBLIC_SITE_EMAIL: "hello@example.org" });

    expect(SITE.email).toBe("hello@example.org");
  });

  it("falls back to an address of its own outside a production build", async () => {
    const { SITE } = await loadSite({ NEXT_PUBLIC_SITE_EMAIL: undefined });

    expect(SITE.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it("treats an empty value as absent", async () => {
    const empty = await loadSite({ NEXT_PUBLIC_SITE_EMAIL: "" });
    const absent = await loadSite({ NEXT_PUBLIC_SITE_EMAIL: undefined });

    expect(empty.SITE.email).toBe(absent.SITE.email);
  });

  it("falls back on a production build when it is absent", async () => {
    const { SITE } = await loadSite({ ...PRODUCTION, NEXT_PUBLIC_SITE_EMAIL: undefined });

    expect(SITE.email).toContain("@");
  });

  it("rejects a value that is not an email address", async () => {
    await expect(loadSite({ NEXT_PUBLIC_SITE_EMAIL: "not-an-email" }))
      .rejects.toThrow("NEXT_PUBLIC_SITE_EMAIL must be an email address.");

    await expect(loadSite({ NEXT_PUBLIC_SITE_EMAIL: "owner@localhost" }))
      .rejects.toThrow("NEXT_PUBLIC_SITE_EMAIL must be an email address.");

    await expect(loadSite({ NEXT_PUBLIC_SITE_EMAIL: "two addresses@example.com" }))
      .rejects.toThrow("NEXT_PUBLIC_SITE_EMAIL must be an email address.");
  });

  it("names the value it refused", async () => {
    await expect(loadSite({ NEXT_PUBLIC_SITE_EMAIL: "not-an-email" }))
      .rejects.toThrow(/not-an-email/);
  });
});

describe("SITE.github and SITE.linkedin", () => {
  it("are the URLs their variables hold", async () => {
    const { SITE } = await loadSite({
      NEXT_PUBLIC_SITE_GITHUB_URL: "https://github.com/someone",
      NEXT_PUBLIC_SITE_LINKEDIN_URL: "https://www.linkedin.com/in/someone/",
    });

    expect(SITE.github).toBe("https://github.com/someone");
    expect(SITE.linkedin).toBe("https://www.linkedin.com/in/someone/");
  });

  it("keep a working link on a production build with neither variable set", async () => {
    const { SITE } = await loadSite({
      ...PRODUCTION,
      NEXT_PUBLIC_SITE_GITHUB_URL: undefined,
      NEXT_PUBLIC_SITE_LINKEDIN_URL: undefined,
    });

    expect(SITE.github).toMatch(/^https:\/\//);
    expect(SITE.linkedin).toMatch(/^https:\/\//);
  });

  it("treat an empty value as absent", async () => {
    const empty = await loadSite({ NEXT_PUBLIC_SITE_GITHUB_URL: "" });
    const absent = await loadSite({ NEXT_PUBLIC_SITE_GITHUB_URL: undefined });

    expect(empty.SITE.github).toBe(absent.SITE.github);
  });

  it("reject a value that is not an absolute URL", async () => {
    await expect(loadSite({ NEXT_PUBLIC_SITE_GITHUB_URL: "github.com/someone" }))
      .rejects.toThrow("NEXT_PUBLIC_SITE_GITHUB_URL must be an absolute URL.");

    await expect(loadSite({ NEXT_PUBLIC_SITE_LINKEDIN_URL: "/in/someone" }))
      .rejects.toThrow("NEXT_PUBLIC_SITE_LINKEDIN_URL must be an absolute URL.");
  });

  it("reject a scheme the browser would not follow as a link", async () => {
    await expect(loadSite({ NEXT_PUBLIC_SITE_GITHUB_URL: "javascript:alert(1)" }))
      .rejects.toThrow("NEXT_PUBLIC_SITE_GITHUB_URL must use http or https.");

    await expect(loadSite({ NEXT_PUBLIC_SITE_LINKEDIN_URL: "mailto:owner@example.com" }))
      .rejects.toThrow("NEXT_PUBLIC_SITE_LINKEDIN_URL must use http or https.");
  });
});

describe("SITE.url", () => {
  it("drops the trailing slashes NEXT_PUBLIC_SITE_URL may carry", async () => {
    const { SITE, SITE_DOMAIN } = await loadSite({
      NEXT_PUBLIC_SITE_URL: "https://example.com//",
    });

    expect(SITE.url).toBe("https://example.com");
    expect(SITE_DOMAIN).toBe("example.com");
  });

  it("stops a production build when it is absent", async () => {
    await expect(loadSite({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: undefined }))
      .rejects.toThrow("NEXT_PUBLIC_SITE_URL is required for a production build.");
  });

  it("rejects a value that is not an absolute URL", async () => {
    await expect(loadSite({ NEXT_PUBLIC_SITE_URL: "example.com" }))
      .rejects.toThrow("NEXT_PUBLIC_SITE_URL must be an absolute URL.");
  });
});

describe("USE_RESEND_EMAIL_FORM", () => {
  it("is true only for the exact string \"true\"", async () => {
    const { USE_RESEND_EMAIL_FORM } = await loadSite({
      NEXT_PUBLIC_USE_RESEND_EMAIL_FORM: "true",
    });

    expect(USE_RESEND_EMAIL_FORM).toBe(true);
  });

  it("is false when the variable is absent", async () => {
    const { USE_RESEND_EMAIL_FORM } = await loadSite({
      NEXT_PUBLIC_USE_RESEND_EMAIL_FORM: undefined,
    });

    expect(USE_RESEND_EMAIL_FORM).toBe(false);
  });

  it("is false for every other value", async () => {
    for (const value of [ "", " ", "false", "0", "1", "TRUE", "True", "yes", "true " ]) {
      const { USE_RESEND_EMAIL_FORM } = await loadSite({
        NEXT_PUBLIC_USE_RESEND_EMAIL_FORM: value,
      });

      expect(USE_RESEND_EMAIL_FORM, `value: "${value}"`).toBe(false);
    }
  });

  it("is a boolean, so a component reads it without parsing a string", async () => {
    const { USE_RESEND_EMAIL_FORM } = await loadSite({
      NEXT_PUBLIC_USE_RESEND_EMAIL_FORM: "true",
    });

    expect(typeof USE_RESEND_EMAIL_FORM).toBe("boolean");
  });
});

describe("resolveSitePlaceholders", () => {
  it("resolves {ownerEmail} to the configured address and {domain} to the host", async () => {
    const { resolveSitePlaceholders } = await loadSite({
      NEXT_PUBLIC_SITE_URL: "https://example.com",
      NEXT_PUBLIC_SITE_EMAIL: "hello@example.org",
    });

    expect(resolveSitePlaceholders("write to {ownerEmail} about {domain}"))
      .toBe("write to hello@example.org about example.com");
  });
});

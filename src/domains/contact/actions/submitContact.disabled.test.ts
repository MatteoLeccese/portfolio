// src/domains/contact/actions/submitContact.disabled.test.ts
import { describe, expect, it, vi } from "vitest";

import { CONTACT_INITIAL_STATE } from "@/domains/contact/types";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  sendContactEmail: vi.fn(),
  checkRateLimit: vi.fn(),
  consumeRateLimit: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/domains/contact/services/mailer", () => ({ sendContactEmail: mocks.sendContactEmail }));
vi.mock("@/domains/contact/services/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  consumeRateLimit: mocks.consumeRateLimit,
}));

delete process.env.NEXT_PUBLIC_USE_RESEND_EMAIL_FORM;

const { submitContact } = await import("@/domains/contact/actions/submitContact");

function payload (): FormData {
  const data = new FormData();
  data.set("name", "Matteo Leccese");
  data.set("email", "matteo@example.com");
  data.set("subject", "A role at your company");
  data.set("message", "I would like to talk about a position in your team, if you have the time.");
  data.set("locale", "en");
  data.set("startedAt", "0");

  return data;
}

describe("submitContact with the Resend path disabled", () => {
  it("refuses the submission", async () => {
    const state = await submitContact(CONTACT_INITIAL_STATE, payload());

    expect(state.status).toBe("error");
    if (state.status !== "error") throw new Error("expected an error state");
    expect(state.code).toBe("internal_error");
  });

  it("reads no request data and reaches no service", async () => {
    await submitContact(CONTACT_INITIAL_STATE, payload());

    expect(mocks.headers).not.toHaveBeenCalled();
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.sendContactEmail).not.toHaveBeenCalled();
  });
});

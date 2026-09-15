// src/domains/contact/actions/submitContact.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RateLimitVerdict } from "@/domains/contact/services/rate-limit";
import {
  CONTACT_ALL_ERROR_CODES,
  CONTACT_INITIAL_STATE,
  CONTACT_LIMITS,
  type ContactState,
} from "@/domains/contact/types";
import type { ContactValues } from "@/domains/contact/types/schema";

const ALLOWED: RateLimitVerdict = { ok: true, code: null, retryAfterSeconds: 0 };

const BLOCKED: RateLimitVerdict = { ok: false, code: "too_many_requests", retryAfterSeconds: 1800 };

const mocks = vi.hoisted(() => ({
  headerBag: new Headers(),
  sendContactEmail: vi.fn<(values: ContactValues) => Promise<void>>(),
  checkRateLimit: vi.fn<(identifier: string) => RateLimitVerdict>(),
  consumeRateLimit: vi.fn<(identifier: string) => void>(),
}));

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(mocks.headerBag),
}));

vi.mock("@/domains/contact/services/mailer", () => ({
  sendContactEmail: mocks.sendContactEmail,
}));

vi.mock("@/domains/contact/services/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  consumeRateLimit: mocks.consumeRateLimit,
}));

const { submitContact } = await import("@/domains/contact/actions/submitContact");

/** A payload that passes every layer, with the fill-time mark a no-JS browser sends. */
const VALID: Record<string, string> = {
  name: "Matteo Leccese",
  email: "matteo@example.com",
  subject: "A role at your company",
  message: "I would like to talk about a position in your team, if you have some time this week.",
  locale: "en",
  hp_field: "",
  startedAt: "0",
};

/** VALID, with `null` in an override meaning "this field does not travel". */
function formOf (overrides: Record<string, string | null> = {}): FormData {
  const data = new FormData();

  for (const [ key, value ] of Object.entries({ ...VALID, ...overrides })) {
    if (value !== null) data.append(key, value);
  }

  return data;
}

function errorState (state: ContactState) {
  if (state.status !== "error") throw new Error(`expected an error, got ${state.status}`);

  return state;
}

async function submit (overrides: Record<string, string | null> = {}, previous = CONTACT_INITIAL_STATE) {
  return submitContact(previous, formOf(overrides));
}

describe("submitContact", () => {
  beforeEach(() => {
    mocks.headerBag = new Headers();
    mocks.sendContactEmail.mockResolvedValue(undefined);
    mocks.checkRateLimit.mockReturnValue(ALLOWED);
    mocks.consumeRateLimit.mockReturnValue(undefined);
    delete process.env.TRUST_PROXY;
  });

  it("relays a valid submission and answers with success alone", async () => {
    const state = await submit();

    expect(state).toEqual({ status: "success", submissionId: 1 });
    expect(mocks.sendContactEmail).toHaveBeenCalledTimes(1);
  });

  it("mails the trimmed values and neither the trap field nor the fill-time mark", async () => {
    await submit({ name: "  Matteo Leccese  " });

    expect(mocks.sendContactEmail).toHaveBeenCalledWith({
      name: "Matteo Leccese",
      email: VALID.email,
      subject: VALID.subject,
      message: VALID.message,
      locale: "en",
    });
  });

  it("accepts a submission made with JavaScript disabled, whose mark is 0", async () => {
    const state = await submit({ startedAt: "0" });

    expect(state.status).toBe("success");
    expect(mocks.sendContactEmail).toHaveBeenCalledTimes(1);
  });

  it("accepts a submission whose mark is absent altogether", async () => {
    const state = await submit({ startedAt: null });

    expect(state.status).toBe("success");
  });

  it("accepts a tampered mark, which degrades to 0 instead of failing", async () => {
    const state = await submit({ startedAt: "not-a-number" });

    expect(state.status).toBe("success");
  });

  it("rejects a submission filled in faster than the minimum fill time", async () => {
    const state = await submit({ startedAt: String(Date.now()) });

    expect(errorState(state).code).toBe("spam_rejected");
    expect(mocks.sendContactEmail).not.toHaveBeenCalled();
  });

  it("accepts a submission that took longer than the minimum fill time", async () => {
    const state = await submit({ startedAt: String(Date.now() - CONTACT_LIMITS.minFillMs - 1000) });

    expect(state.status).toBe("success");
  });

  it("rejects a filled trap field before it costs a send", async () => {
    const state = await submit({ hp_field: "https://buy.example.com" });

    expect(errorState(state).code).toBe("spam_rejected");
    expect(mocks.sendContactEmail).not.toHaveBeenCalled();
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it("accepts a submission whose trap field does not travel", async () => {
    const state = await submit({ hp_field: null });

    expect(state.status).toBe("success");
  });

  it("answers validation_error with one code per invalid field, and sends nothing", async () => {
    const state = errorState(await submit({ name: "", email: "nope", subject: "", message: "" }));

    expect(state.code).toBe("validation_error");
    expect(state.fieldErrors).toEqual({
      name: [ "name_too_short" ],
      email: [ "email_invalid" ],
      subject: [ "subject_too_short" ],
      message: [ "message_too_short" ],
    });
    expect(mocks.sendContactEmail).not.toHaveBeenCalled();
  });

  it("answers with a code the catalogue can translate, never with prose", async () => {
    const codes: string[] = [ ...CONTACT_ALL_ERROR_CODES ];
    const rejections = [
      await submit({ message: "too short" }),
      await submit({ hp_field: "bot" }),
      await submit({ startedAt: String(Date.now()) }),
    ];

    for (const state of rejections) {
      const failed = errorState(state);

      expect(codes).toContain(failed.code);
      for (const messages of Object.values(failed.fieldErrors ?? {})) {
        for (const message of messages) expect(codes).toContain(message);
      }
    }
  });

  it("answers too_many_requests without reaching the mailer", async () => {
    mocks.checkRateLimit.mockReturnValue(BLOCKED);

    const state = errorState(await submit());

    expect(state.code).toBe("too_many_requests");
    expect(mocks.sendContactEmail).not.toHaveBeenCalled();
  });

  it("counts the request only once the send has succeeded", async () => {
    await submit();

    expect(mocks.consumeRateLimit).toHaveBeenCalledTimes(1);
  });

  it("leaves the visitor his remaining attempts when the send fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.sendContactEmail.mockRejectedValue(new Error("Resend request failed: 502"));

    const state = errorState(await submit());

    expect(state.code).toBe("email_send_failed");
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
  });

  it("hands the text back on failure, exactly as it was typed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.sendContactEmail.mockRejectedValue(new Error("Resend request failed: 502"));

    const state = errorState(await submit({ name: "  Matteo  " }));

    expect(state.values).toEqual({
      name: "  Matteo  ",
      email: VALID.email,
      subject: VALID.subject,
      message: VALID.message,
    });
  });

  it("logs the provider's own message and nothing the visitor typed", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.sendContactEmail.mockRejectedValue(new Error("Resend error: validation_error"));

    await submit();

    const written = logged.mock.calls.flat().join(" ");

    expect(written).toContain("Resend error");
    expect(written).not.toContain(VALID.email);
    expect(written).not.toContain(VALID.name);
    expect(written).not.toContain(VALID.message);
  });

  it("turns an exception from any layer into internal_error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.checkRateLimit.mockImplementation(() => {
      throw new Error("Missing environment variable: RATE_LIMIT_SALT");
    });

    expect(errorState(await submit()).code).toBe("internal_error");
  });

  it("numbers every answer after the previous one, so the fields remount", async () => {
    const previous: ContactState = {
      status: "error",
      code: "validation_error",
      fieldErrors: null,
      values: {},
      submissionId: 4,
    };

    expect((await submit({}, previous)).submissionId).toBe(5);
  });

  it("degrades an unknown locale to the default instead of failing", async () => {
    const state = await submit({ locale: "fr" });

    expect(state.status).toBe("success");
    expect(mocks.sendContactEmail).toHaveBeenCalledWith(expect.objectContaining({ locale: "en" }));
  });
});

describe("the rate-limit identifier", () => {
  beforeEach(() => {
    mocks.headerBag = new Headers();
    mocks.sendContactEmail.mockResolvedValue(undefined);
    mocks.checkRateLimit.mockReturnValue(ALLOWED);
    mocks.consumeRateLimit.mockReturnValue(undefined);
    delete process.env.TRUST_PROXY;
  });

  it("takes the first address the platform header carries", async () => {
    mocks.headerBag = new Headers({ "x-vercel-forwarded-for": "203.0.113.7, 70.41.3.18" });

    await submit();

    expect(mocks.checkRateLimit).toHaveBeenCalledWith("203.0.113.7");
  });

  it("ignores a forged x-forwarded-for while TRUST_PROXY is off", async () => {
    mocks.headerBag = new Headers({ "x-forwarded-for": "203.0.113.7" });

    await submit();

    expect(mocks.checkRateLimit).toHaveBeenCalledWith("unknown");
  });

  it("reads x-forwarded-for only behind a proxy that overwrites it", async () => {
    process.env.TRUST_PROXY = "1";
    mocks.headerBag = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" });

    await submit();

    expect(mocks.checkRateLimit).toHaveBeenCalledWith("203.0.113.7");
  });

  it("prefers the platform header over the forwarded one", async () => {
    process.env.TRUST_PROXY = "1";
    mocks.headerBag = new Headers({
      "x-forwarded-for": "198.51.100.1",
      "x-vercel-forwarded-for": "203.0.113.7",
    });

    await submit();

    expect(mocks.checkRateLimit).toHaveBeenCalledWith("203.0.113.7");
  });

  it("falls back to one shared bucket when no header names the visitor", async () => {
    await submit();

    expect(mocks.checkRateLimit).toHaveBeenCalledWith("unknown");
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith("unknown");
  });
});

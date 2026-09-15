// src/domains/contact/types/schema.test.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  type ContactFieldName,
  CONTACT_ALL_ERROR_CODES,
  CONTACT_ERROR_CODES,
  CONTACT_FIELD_ERROR_CODES,
  CONTACT_LIMITS,
} from "@/domains/contact/types";
import { contactPayloadSchema, contactSchema } from "@/domains/contact/types/schema";

const VALID = {
  name: "Matteo Leccese",
  email: "matteo@example.com",
  subject: "A role at your company",
  message: "I would like to talk about a position in your team, if you have some time this week.",
  locale: "en",
  hp_field: "",
  startedAt: 1_757_000_000_000,
};

const DOMAIN_PART = "@example.com";

/** Every error code the failed parse produced, in issue order. */
function codesFor (input: Record<string, unknown>): string[] {
  const result = contactPayloadSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.message);
}

/** The codes produced by replacing a single field of an otherwise valid payload. */
function codesForField (field: ContactFieldName, value: unknown): string[] {
  return codesFor({ ...VALID, [ field ]: value });
}

/** An email address of exactly `length` characters. */
function emailOfLength (length: number): string {
  return `${"a".repeat(length - DOMAIN_PART.length)}${DOMAIN_PART}`;
}

/** The `Contact.errors` keys of a catalog, read from messages/ on disk. */
function catalogErrorKeys (locale: string): string[] {
  const file = fileURLToPath(new URL(`../../../../messages/${locale}.json`, import.meta.url));
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  const contact = (parsed as { Contact?: { errors?: Record<string, string>; }; }).Contact;
  return Object.keys(contact?.errors ?? {}).sort();
}

describe("contact schema", () => {
  it("accepts a well formed payload", () => {
    expect(contactPayloadSchema.safeParse(VALID).success).toBe(true);
  });

  it("emits a code, never prose, for every failure it can produce", () => {
    const allowed: string[] = [ ...CONTACT_FIELD_ERROR_CODES, "spam_rejected" ];
    const cases: Record<string, unknown>[] = [
      { ...VALID, name: null },
      { ...VALID, name: "a" },
      { ...VALID, name: "a".repeat(CONTACT_LIMITS.nameMax + 1) },
      { ...VALID, email: null },
      { ...VALID, email: "not-an-email" },
      { ...VALID, email: emailOfLength(CONTACT_LIMITS.emailMax + 1) },
      { ...VALID, subject: "ab" },
      { ...VALID, subject: "a".repeat(CONTACT_LIMITS.subjectMax + 1) },
      { ...VALID, message: "too short" },
      { ...VALID, message: "a".repeat(CONTACT_LIMITS.messageMax + 1) },
      { ...VALID, hp_field: "filled in by a bot" },
      { name: undefined, email: undefined, subject: undefined, message: undefined },
    ];

    for (const input of cases) {
      const codes = codesFor(input);
      expect(codes.length).toBeGreaterThan(0);
      for (const code of codes) expect(allowed).toContain(code);
    }
  });

  it("trims before measuring, so whitespace never passes as content", () => {
    expect(codesForField("name", "  a  ")).toEqual([ "name_too_short" ]);
    expect(codesForField("message", `  ${" ".repeat(40)}  `)).toEqual([ "message_too_short" ]);
  });

  it("rejects an empty honeypot field only when it carries text", () => {
    expect(codesFor({ ...VALID, hp_field: "" })).toEqual([]);
    expect(codesFor({ ...VALID, hp_field: "x" })).toEqual([ "spam_rejected" ]);
    expect(codesFor({ ...VALID, hp_field: null })).toEqual([ "spam_rejected" ]);
  });

  it("degrades locale and startedAt instead of failing", () => {
    const parsed = contactPayloadSchema.safeParse({ ...VALID, locale: "fr", startedAt: "nope" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.locale).toBe("en");
      expect(parsed.data.startedAt).toBe(0);
    }
  });

  it("degrades a missing startedAt to zero, which is what a no-script submission sends", () => {
    const parsed = contactPayloadSchema.safeParse({ ...VALID, startedAt: undefined });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.startedAt).toBe(0);
  });

  it("keeps a valid locale", () => {
    const parsed = contactPayloadSchema.safeParse({ ...VALID, locale: "es" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.locale).toBe("es");
  });

  it("validates a single field with the same rules as the server", () => {
    expect(contactSchema.shape.email.safeParse("nope").success).toBe(false);
    expect(contactSchema.shape.email.safeParse("a@b.co").success).toBe(true);
    expect(contactSchema.shape.name.safeParse("a").success).toBe(false);
    expect(contactSchema.shape.name.safeParse("Ada").success).toBe(true);
  });

  it("has a translation for every code, in en and es, with no leftovers", () => {
    const codes = [ ...CONTACT_ALL_ERROR_CODES ].sort();

    expect(codes).toEqual([ ...CONTACT_FIELD_ERROR_CODES, ...CONTACT_ERROR_CODES ].sort());
    expect(catalogErrorKeys("en")).toEqual(codes);
    expect(catalogErrorKeys("es")).toEqual(codes);
  });
});

describe("contact schema length boundaries", () => {
  const cases: { field: ContactFieldName; min: number; max: number; short: string; long: string; }[] = [
    {
      field: "name",
      min: CONTACT_LIMITS.nameMin,
      max: CONTACT_LIMITS.nameMax,
      short: "name_too_short",
      long: "name_too_long",
    },
    {
      field: "subject",
      min: CONTACT_LIMITS.subjectMin,
      max: CONTACT_LIMITS.subjectMax,
      short: "subject_too_short",
      long: "subject_too_long",
    },
    {
      field: "message",
      min: CONTACT_LIMITS.messageMin,
      max: CONTACT_LIMITS.messageMax,
      short: "message_too_short",
      long: "message_too_long",
    },
  ];

  for (const { field, min, max, short, long } of cases) {
    it(`accepts ${field} at exactly ${min} and ${max} characters`, () => {
      expect(codesForField(field, "a".repeat(min))).toEqual([]);
      expect(codesForField(field, "a".repeat(max))).toEqual([]);
    });

    it(`rejects ${field} one character under ${min} and one over ${max}`, () => {
      expect(codesForField(field, "a".repeat(min - 1))).toEqual([ short ]);
      expect(codesForField(field, "a".repeat(max + 1))).toEqual([ long ]);
    });
  }

  it("accepts an email at exactly the maximum length and rejects one character more", () => {
    expect(codesForField("email", emailOfLength(CONTACT_LIMITS.emailMax))).toEqual([]);
    expect(codesForField("email", emailOfLength(CONTACT_LIMITS.emailMax + 1)))
      .toEqual([ "email_too_long" ]);
  });

  it("reports the length limits the catalog copy states", () => {
    expect(CONTACT_LIMITS.nameMin).toBe(2);
    expect(CONTACT_LIMITS.nameMax).toBe(80);
    expect(CONTACT_LIMITS.subjectMin).toBe(3);
    expect(CONTACT_LIMITS.subjectMax).toBe(120);
    expect(CONTACT_LIMITS.messageMin).toBe(20);
    expect(CONTACT_LIMITS.messageMax).toBe(2000);
  });
});

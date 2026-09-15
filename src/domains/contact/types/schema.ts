// src/domains/contact/types/schema.ts
import * as z from "zod";

import { CONTACT_LIMITS } from "@/domains/contact/types";
import { DEFAULT_LOCALE, LOCALES } from "@/domains/core/config/locales";

/**
 * The four visitor fields. Every message is a `Contact.errors` key, never prose, so the
 * same schema validates in both languages and next-intl renders the text.
 */
export const contactSchema = z.object({
  name: z
    .string({ error: "name_too_short" })
    .trim()
    .min(CONTACT_LIMITS.nameMin, { error: "name_too_short" })
    .max(CONTACT_LIMITS.nameMax, { error: "name_too_long" }),
  email: z
    .string({ error: "email_invalid" })
    .trim()
    .max(CONTACT_LIMITS.emailMax, { error: "email_too_long" })
    .pipe(z.email({ error: "email_invalid" })),
  subject: z
    .string({ error: "subject_too_short" })
    .trim()
    .min(CONTACT_LIMITS.subjectMin, { error: "subject_too_short" })
    .max(CONTACT_LIMITS.subjectMax, { error: "subject_too_long" }),
  message: z
    .string({ error: "message_too_short" })
    .trim()
    .min(CONTACT_LIMITS.messageMin, { error: "message_too_short" })
    .max(CONTACT_LIMITS.messageMax, { error: "message_too_long" }),
  locale: z.enum(LOCALES).catch(DEFAULT_LOCALE),
});

/**
 * What the Server Action parses. The two extra entries degrade instead of failing:
 * `hp_field` must be empty and `startedAt` falls back to `0` when it is absent or
 * tampered with.
 */
export const contactPayloadSchema = contactSchema.extend({
  hp_field: z.string({ error: "spam_rejected" }).max(0, { error: "spam_rejected" }),
  startedAt: z.coerce.number().int().nonnegative().catch(0),
});

export type ContactValues = z.infer<typeof contactSchema>;

export type ContactPayload = z.infer<typeof contactPayloadSchema>;

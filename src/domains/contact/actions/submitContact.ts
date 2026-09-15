// src/domains/contact/actions/submitContact.ts
"use server";

import { headers } from "next/headers";
import * as z from "zod";

import { sendContactEmail } from "@/domains/contact/services/mailer";
import { checkRateLimit, consumeRateLimit } from "@/domains/contact/services/rate-limit";
import {
  CONTACT_FIELDS,
  CONTACT_LIMITS,
  type ContactErrorCode,
  type ContactFieldErrors,
  type ContactState,
  type ContactValuesEcho,
} from "@/domains/contact/types";
import { contactPayloadSchema } from "@/domains/contact/types/schema";
import { USE_RESEND_EMAIL_FORM } from "@/domains/core/config/site";

/** The first comma-separated entry of a header value, trimmed, or null when it is empty. */
function firstValue (raw: string | null): string | null {
  if (!raw) return null;

  const first = raw.split(",")[ 0 ];

  return first ? first.trim() : null;
}

/**
 * The rate-limit identifier of one request: the address the platform writes, then
 * `x-forwarded-for` when TRUST_PROXY is "1", then the shared "unknown" bucket.
 */
function clientIp (headerBag: Headers): string {
  const platform = firstValue(headerBag.get("x-vercel-forwarded-for"));
  if (platform) return platform;

  if (process.env.TRUST_PROXY === "1") {
    const forwarded = firstValue(headerBag.get("x-forwarded-for"));
    if (forwarded) return forwarded;
  }

  return "unknown";
}

/** The four visitor fields as they arrived, so the fields can refill themselves. */
function echo (formData: FormData): ContactValuesEcho {
  const values: ContactValuesEcho = {};

  for (const field of CONTACT_FIELDS) {
    const raw = formData.get(field);
    if (typeof raw === "string") values[ field ] = raw;
  }

  return values;
}

/** One rejection, carrying a code, the offending fields and the submitted text. */
function failure (
  previous: ContactState,
  formData: FormData,
  code: ContactErrorCode,
  fieldErrors: ContactFieldErrors | null = null,
): ContactState {
  return {
    status: "error",
    code,
    fieldErrors,
    values: echo(formData),
    submissionId: previous.submissionId + 1,
  };
}

/** Writes the provider's own message to the log, and nothing the visitor typed. */
function logFailure (label: string, cause: unknown): void {
  console.error(`[contact] ${label}:`, cause instanceof Error ? cause.message : "unknown error");
}

/** Shape, honeypot, fill time, rate limit, send. In that order. */
async function handleSubmit (previous: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = contactPayloadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    locale: formData.get("locale"),
    hp_field: formData.get("hp_field") ?? "",
    startedAt: formData.get("startedAt"),
  });

  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    if (flat.fieldErrors.hp_field) return failure(previous, formData, "spam_rejected");

    const fieldErrors: ContactFieldErrors = {};
    for (const field of CONTACT_FIELDS) {
      const messages = flat.fieldErrors[ field ];
      if (messages && messages.length > 0) fieldErrors[ field ] = messages;
    }

    return failure(previous, formData, "validation_error", fieldErrors);
  }

  const { hp_field: honeypot, startedAt, ...values } = parsed.data;

  if (honeypot.length > 0) return failure(previous, formData, "spam_rejected");

  // `startedAt` is 0 whenever no script wrote the mark, which is every submission made
  // with JavaScript disabled. Zero is no timing evidence and passes.
  if (startedAt > 0 && Date.now() - startedAt < CONTACT_LIMITS.minFillMs) {
    return failure(previous, formData, "spam_rejected");
  }

  const identifier = clientIp(await headers());
  const verdict = checkRateLimit(identifier);
  if (!verdict.ok) return failure(previous, formData, verdict.code);

  try {
    await sendContactEmail(values);
  } catch (cause: unknown) {
    logFailure("send failed", cause);

    return failure(previous, formData, "email_send_failed");
  }

  consumeRateLimit(identifier);

  return { status: "success", submissionId: previous.submissionId + 1 };
}

/**
 * Validates one submission from scratch and relays it by email. Refuses before reading
 * any request data when NEXT_PUBLIC_USE_RESEND_EMAIL_FORM is not "true".
 *
 * Nothing the client checked is trusted: the payload is parsed again here. Every
 * rejection returns a `Contact.errors` code, never a sentence, and carries the submitted
 * text back. Success carries neither the text nor a code.
 */
export async function submitContact (
  previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  if (!USE_RESEND_EMAIL_FORM) return failure(previous, formData, "internal_error");

  try {
    return await handleSubmit(previous, formData);
  } catch (cause: unknown) {
    logFailure("unexpected failure", cause);

    return failure(previous, formData, "internal_error");
  }
}

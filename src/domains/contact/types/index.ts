// src/domains/contact/types/index.ts

/** The four fields the visitor fills in. */
export const CONTACT_FIELDS = [ "name", "email", "subject", "message" ] as const;

export type ContactFieldName = (typeof CONTACT_FIELDS)[ number ];

/** Per-field error codes, keyed by field name. Values are `Contact.errors` keys. */
export type ContactFieldErrors = Partial<Record<ContactFieldName, string[]>>;

/** The submitted text returned to the client, per field. */
export type ContactValuesEcho = Partial<Record<ContactFieldName, string>>;

/** Codes the action itself emits. They describe the submission, not a field. */
export const CONTACT_ERROR_CODES = [
  "email_send_failed",
  "internal_error",
  "spam_rejected",
  "too_many_requests",
  "validation_error",
] as const;

export type ContactActionErrorCode = (typeof CONTACT_ERROR_CODES)[ number ];

/** Codes the zod schema emits per field. */
export const CONTACT_FIELD_ERROR_CODES = [
  "email_invalid",
  "email_too_long",
  "message_too_long",
  "message_too_short",
  "name_too_long",
  "name_too_short",
  "subject_too_long",
  "subject_too_short",
] as const;

export type ContactFieldErrorCode = (typeof CONTACT_FIELD_ERROR_CODES)[ number ];

/** Every code the contact form can emit. One `Contact.errors` key each, in en and es. */
export const CONTACT_ALL_ERROR_CODES = [
  ...CONTACT_FIELD_ERROR_CODES,
  ...CONTACT_ERROR_CODES,
] as const;

export type ContactErrorCode = ContactFieldErrorCode | ContactActionErrorCode;

export const CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 80,
  emailMax: 254,
  subjectMin: 3,
  subjectMax: 120,
  messageMin: 20,
  messageMax: 2000,
  minFillMs: 3000,
} as const;

/**
 * The result of one submission. `values` carries the submitted text back to the fields
 * and `submissionId` keys the field block that remounts with it.
 */
export type ContactState =
  | { status: "idle"; submissionId: 0; }
  | { status: "success"; submissionId: number; }
  | {
    status: "error";
    code: ContactErrorCode;
    fieldErrors: ContactFieldErrors | null;
    values: ContactValuesEcho;
    submissionId: number;
  };

export const CONTACT_INITIAL_STATE: ContactState = { status: "idle", submissionId: 0 };

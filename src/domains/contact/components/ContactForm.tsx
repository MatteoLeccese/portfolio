// src/domains/contact/components/ContactForm.tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type ReactNode,
} from "react";

import { AnimatePresence, m, MotionIsland } from "@/components/motion/MotionIsland";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitContact } from "@/domains/contact/actions/submitContact";
import {
  CONTACT_FIELDS,
  CONTACT_FIELD_ERROR_CODES,
  CONTACT_INITIAL_STATE,
  CONTACT_LIMITS,
  type ContactFieldErrorCode,
  type ContactFieldName,
} from "@/domains/contact/types";
import { contactSchema } from "@/domains/contact/types/schema";
import { Link } from "@/i18n/navigation";
import { DURATION_MS, EASE_STANDARD, seconds } from "@/lib/motion/tokens";

/** Codes produced on the client by validating one field on blur or on change. */
type LocalErrors = Partial<Record<ContactFieldName, string | null>>;

const AUTOCOMPLETE: Record<ContactFieldName, string> = {
  name: "name",
  email: "email",
  subject: "off",
  message: "off",
};

const MAX_LENGTH: Record<ContactFieldName, number> = {
  name: CONTACT_LIMITS.nameMax,
  email: CONTACT_LIMITS.emailMax,
  subject: CONTACT_LIMITS.subjectMax,
  message: CONTACT_LIMITS.messageMax,
};

/** Marks the four visitor controls, so focus never lands on the trap field. */
const FIELD_MARK = "data-contact-field";

const FIRST_FIELD = `[${FIELD_MARK}]`;

const FIRST_INVALID_FIELD = `[${FIELD_MARK}][aria-invalid="true"]`;

/** Whether a schema message is one of the eight per-field codes. */
function isFieldErrorCode (value: string): value is ContactFieldErrorCode {
  return (CONTACT_FIELD_ERROR_CODES as readonly string[]).includes(value);
}

interface ContactFormProps {

  /** The address the rescue `mailto:` points at when the send itself fails. */
  readonly ownerEmail: string;
}

/**
 * The contact form: four fields, a Server Action and a crossfade to the confirmation.
 *
 * It is a real `<form>` with a real `action`, so it submits before hydration and with
 * JavaScript switched off. It carries the locale and the fill-time mark as hidden
 * values — the mark stays at "0" whenever no script writes it — and the trap field the
 * `honeypot` utility moves off the viewport.
 */
export function ContactForm ({ ownerEmail }: ContactFormProps) {
  const t = useTranslations("Contact");
  const locale = useLocale();
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLOutputElement>(null);
  const startedAtRef = useRef<HTMLInputElement>(null);
  const [ state, formAction, isPending ] = useActionState(submitContact, CONTACT_INITIAL_STATE);
  const [ localErrors, setLocalErrors ] = useState<LocalErrors>({});
  const [ messageLength, setMessageLength ] = useState(0);
  const [ seenSubmission, setSeenSubmission ] = useState(state.submissionId);
  const [ dismissedSubmission, setDismissedSubmission ] = useState(0);

  // The answer remounts the fields with the values the server returned, so the errors
  // the client had found no longer describe what is on screen.
  if (seenSubmission !== state.submissionId) {
    setSeenSubmission(state.submissionId);
    setLocalErrors({});
    setMessageLength(state.status === "error" ? (state.values.message ?? "").length : 0);
  }

  const showSuccess = state.status === "success" && dismissedSubmission !== state.submissionId;

  useEffect(() => {
    const mark = startedAtRef.current;
    if (mark) mark.value = String(Date.now());
  }, []);

  useEffect(() => {
    if (state.submissionId === 0 && dismissedSubmission === 0) return;

    if (showSuccess) {
      successRef.current?.focus();

      return;
    }

    const form = formRef.current;
    if (!form) return;

    if (state.status === "error") {
      (form.querySelector<HTMLElement>(FIRST_INVALID_FIELD) ?? statusRef.current)?.focus();

      return;
    }

    form.querySelector<HTMLElement>(FIRST_FIELD)?.focus();
  }, [ showSuccess, state.status, state.submissionId, dismissedSubmission ]);

  /** Runs the server rule for one field and keeps its code, or clears it. */
  function validateField (field: ContactFieldName, value: string): void {
    const result = contactSchema.shape[ field ].safeParse(value);

    setLocalErrors((previous) => ({
      ...previous,
      [ field ]: result.success ? null : (result.error.issues[ 0 ]?.message ?? null),
    }));
  }

  /** The message shown under one field: the client's code first, then the server's. */
  function errorFor (field: ContactFieldName): string | undefined {
    const local = localErrors[ field ];
    const code = local === undefined
      ? (state.status === "error" ? state.fieldErrors?.[ field ]?.[ 0 ] : undefined)
      : local;

    if (!code) return undefined;

    return isFieldErrorCode(code) ? t(`errors.${code}`) : t("errors.validation_error");
  }

  function valueOf (field: ContactFieldName): string {
    return state.status === "error" ? (state.values[ field ] ?? "") : "";
  }

  const rescueHref = state.status === "error"
    ? `mailto:${ownerEmail}?subject=${encodeURIComponent(state.values.subject ?? "")}&body=${encodeURIComponent(state.values.message ?? "")}`
    : `mailto:${ownerEmail}`;

  function rescueLink (chunks: ReactNode) {
    return <a className="underline underline-offset-2" href={rescueHref}>{chunks}</a>;
  }

  function privacyLink (chunks: ReactNode) {
    return <Link className="underline underline-offset-2" href="/privacy">{chunks}</Link>;
  }

  const successPanel = (
    <output
      ref={successRef}
      aria-live="polite"
      className="block rounded-xl border border-hairline bg-card p-6 text-card-foreground"
      data-state="success"
      data-testid="contact-status"
      tabIndex={-1}
    >
      <p className="font-medium">{t("status.successTitle")}</p>
      <p className="mt-2 text-meta text-muted-foreground">{t("status.successBody")}</p>
      <Button
        className="mt-4"
        onClick={() => {
          setDismissedSubmission(state.submissionId);
        }}
        type="button"
        variant="subtle"
      >
        {t("status.successAgain")}
      </Button>
    </output>
  );

  const formFields = (
    <>
      <div aria-hidden="true" className="honeypot">
        <label htmlFor={`${formId}-hp`}>{t("form.honeypot")}</label>
        <input
          autoComplete="new-password"
          defaultValue=""
          id={`${formId}-hp`}
          name="hp_field"
          tabIndex={-1}
          type="text"
        />
      </div>

      <fieldset key={state.submissionId} className="contents" disabled={isPending}>
        {CONTACT_FIELDS.map((field) => {
          const inputId = `${formId}-${field}`;
          const errorId = `${inputId}-error`;
          const error = errorFor(field);
          const shared = {
            [ FIELD_MARK ]: "",
            "aria-describedby": error ? errorId : undefined,
            "aria-invalid": error ? true : undefined,
            autoComplete: AUTOCOMPLETE[ field ],
            defaultValue: valueOf(field),
            id: inputId,
            maxLength: MAX_LENGTH[ field ],
            name: field,
            placeholder: t(`form.${field}Placeholder`),
            required: true,
            onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              validateField(field, event.currentTarget.value);
            },
            onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              if (field === "message") setMessageLength(event.currentTarget.value.length);
              if (error) validateField(field, event.currentTarget.value);
            },
          };

          return (
            <Field key={field}>
              <FieldLabel htmlFor={inputId}>{t(`form.${field}Label`)}</FieldLabel>

              {field === "message"
                ? <Textarea {...shared} rows={6} />
                : <Input {...shared} type={field === "email" ? "email" : "text"} />}

              {field === "message"
                ? (
                  <p aria-hidden="true" className="text-meta text-muted-foreground">
                    {t("form.messageCounter", {
                      count: messageLength,
                      max: CONTACT_LIMITS.messageMax,
                    })}
                  </p>
                )
                : null}

              {error ? <FieldError className="field-error" id={errorId}>{error}</FieldError> : null}
            </Field>
          );
        })}
      </fieldset>

      {state.status === "error"
        ? (
          <div
            ref={statusRef}
            aria-live="assertive"
            className="min-h-5"
            data-code={state.code}
            data-state="error"
            data-testid="contact-status"
            role="alert"
            tabIndex={-1}
          >
            <p className="text-meta text-destructive">
              {state.code === "email_send_failed" || state.code === "internal_error"
                ? t.rich(`errors.${state.code}`, { ownerEmail, mail: rescueLink })
                : t(`errors.${state.code}`)}
            </p>
          </div>
        )
        : <div className="min-h-5" />}

      <Button aria-busy={isPending} className="self-start" disabled={isPending} type="submit">
        {isPending
          ? (
            <>
              <span
                aria-hidden="true"
                className="submit-spinner size-4 rounded-full border-2 border-current border-t-transparent"
              />
              <span aria-hidden="true" className="submit-dots gap-1">
                <span className="size-1 rounded-full bg-current" />
                <span className="size-1 rounded-full bg-current" />
                <span className="size-1 rounded-full bg-current" />
              </span>
              {t("form.submitting")}
            </>
          )
          : t("form.submit")}
      </Button>

      <p className="text-meta text-muted-foreground">
        {t.rich("form.privacyNotice", { privacy: privacyLink })}
      </p>
    </>
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className="relative"
      data-testid="contact-form"
      noValidate
    >
      <input name="locale" type="hidden" value={locale} />
      <input ref={startedAtRef} defaultValue="0" name="startedAt" type="hidden" />

      <MotionIsland>
        <div className="contact-stack">
          <AnimatePresence initial={false} mode="sync">
            {showSuccess
              ? (
                <m.div
                  key="success"
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  transition={{ duration: seconds(DURATION_MS.slow), ease: EASE_STANDARD }}
                >
                  {successPanel}
                </m.div>
              )
              : (
                <m.div
                  key="form"
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-5"
                  exit={{ opacity: 0 }}
                  initial={false}
                  transition={{ duration: seconds(DURATION_MS.base), ease: EASE_STANDARD }}
                >
                  {formFields}
                </m.div>
              )}
          </AnimatePresence>
        </div>
      </MotionIsland>
    </form>
  );
}

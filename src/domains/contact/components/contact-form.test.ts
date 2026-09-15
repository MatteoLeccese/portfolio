// src/domains/contact/components/contact-form.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guards for the two client islands of the contact surface, read from their source.
 *
 * The test environment is `node`: what cannot be rendered here is asserted where it is
 * written. Everything checked below is an invariant a browser cannot recover from — a
 * form that only submits with JavaScript, a trap field that catches the visitor, a state
 * change no screen reader hears.
 */
const ROOT = process.cwd();

const FORM = "src/domains/contact/components/ContactForm.tsx";

const COPY = "src/components/common/CopyButton.tsx";

const SECTION = "src/domains/contact/components/ContactSection.tsx";

const CHANNELS = "src/domains/contact/components/ContactChannels.tsx";

/** Source with comments stripped, so a guard matches code and not the prose around it. */
function code (path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

function occurrences (source: string, needle: string): number {
  return source.split(needle).length - 1;
}

describe("ContactForm without JavaScript", () => {
  it("is a real form with a real action, and no interception", () => {
    const source = code(FORM);

    expect(source).toContain("<form");
    expect(source).toContain("action={formAction}");
    expect(source).not.toContain("onSubmit");
    expect(source).not.toContain("preventDefault");
    expect(source).not.toContain("react-hook-form");
  });

  it("serves the fill-time mark as 0, which is what a page without scripts submits", () => {
    const source = code(FORM);

    expect(source).toContain(`defaultValue="0"`);
    expect(source).toContain(`name="startedAt"`);
    expect(source).toContain("String(Date.now())");
  });

  it("writes that mark from an effect, so no server render depends on the clock", () => {
    const source = code(FORM);
    const effect = source.indexOf("useEffect");
    const write = source.indexOf("mark.value = String(Date.now())");

    expect(effect).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(effect);
  });

  it("carries the locale as a value, not as a script-set one", () => {
    expect(code(FORM)).toContain(`<input name="locale" type="hidden" value={locale} />`);
  });
});

describe("ContactForm anti-abuse", () => {
  it("hides the trap field off the viewport instead of removing it from the page", () => {
    const source = code(FORM);

    expect(source).toContain(`className="honeypot"`);
    expect(source).not.toContain("display: none");
    expect(source).not.toContain(`type="hidden"\n          name="hp_field"`);
  });

  it("labels the trap field and keeps it out of the reading and tab orders", () => {
    const source = code(FORM);

    expect(source).toContain(`aria-hidden="true" className="honeypot"`);
    expect(source).toContain(`{t("form.honeypot")}`);
    expect(source).toContain("tabIndex={-1}");
    expect(source).toContain(`autoComplete="new-password"`);
  });

  it("keeps the trap field outside the fieldset, where disabling cannot drop it", () => {
    const source = code(FORM);

    expect(source.indexOf(`name="hp_field"`)).toBeLessThan(source.indexOf("<fieldset"));
  });

  it("never lets focus land on the trap field", () => {
    const source = code(FORM);

    expect(source).toContain("const FIELD_MARK");
    expect(source).toContain("FIRST_FIELD");
    expect(source).toContain("FIRST_INVALID_FIELD");
    expect(source).not.toContain(`querySelector<HTMLElement>("input`);
  });
});

describe("ContactForm accessibility", () => {
  it("disables the fieldset rather than every control, and says so in text", () => {
    const source = code(FORM);

    expect(source).toContain("<fieldset key={state.submissionId} className=\"contents\" disabled={isPending}>");
    expect(source).toContain("aria-busy={isPending}");
    expect(source).toContain(`{t("form.submitting")}`);
  });

  it("guards the double submission from the button as well as from the fieldset", () => {
    expect(occurrences(code(FORM), "disabled={isPending}")).toBe(2);
  });

  it("points every invalid field at the message that explains it", () => {
    const source = code(FORM);

    expect(source).toContain(`"aria-describedby": error ? errorId : undefined`);
    expect(source).toContain(`"aria-invalid": error ? true : undefined`);
    expect(source).toContain("<FieldLabel htmlFor={inputId}>");
  });

  it("announces the outcome, and moves the focus to the node that carries it", () => {
    const source = code(FORM);

    expect(source).toContain(`role="alert"`);
    expect(source).toContain(`aria-live="assertive"`);
    expect(source).toContain("<output");
    expect(source).toContain(`aria-live="polite"`);
    expect(source).toContain("successRef.current?.focus()");
    expect(source).toContain("statusRef.current)?.focus()");
  });

  it("turns off the native bubbles and keeps the ARIA the required attribute exposes", () => {
    const source = code(FORM);

    expect(source).toContain("noValidate");
    expect(source).toContain("required: true");
  });

  it("keeps the character counter out of the live announcements", () => {
    const source = code(FORM);
    const counter = source.indexOf(`t("form.messageCounter"`);

    expect(counter).toBeGreaterThan(-1);
    expect(source.slice(counter - 200, counter)).toContain(`aria-hidden="true"`);
  });

  it("holds exactly one status node in each branch, under the closed test contract", () => {
    const source = code(FORM);

    expect(occurrences(source, `data-testid="contact-status"`)).toBe(2);
    expect(occurrences(source, `data-testid="contact-form"`)).toBe(1);
    expect(source).toContain(`data-state="success"`);
    expect(source).toContain(`data-state="error"`);
    expect(source).toContain("data-code={state.code}");
  });

  it("reserves the height of the message line, so showing it moves nothing", () => {
    expect(occurrences(code(FORM), "min-h-5")).toBe(2);
  });
});

describe("ContactForm copy", () => {
  it("renders every string through the Contact namespace", () => {
    const source = code(FORM);

    expect(source).toContain(`useTranslations("Contact")`);
    expect(source).toContain("t(`errors.${code}`)");
    expect(source).toContain("t(`errors.${state.code}`)");
  });

  it("falls back to validation_error rather than showing an internal string", () => {
    const source = code(FORM);

    expect(source).toContain("isFieldErrorCode(code)");
    expect(source).toContain(`t("errors.validation_error")`);
  });

  it("links the privacy notice, and offers a prefilled rescue when the send breaks", () => {
    const source = code(FORM);

    expect(source).toContain(`t.rich("form.privacyNotice"`);
    expect(source).toContain(`href="/privacy"`);
    expect(source).toContain("mailto:${ownerEmail}?subject=");
    expect(source).toContain("encodeURIComponent");
  });
});

describe("CopyButton", () => {
  it("is a client island that reads no catalogue: both labels arrive translated", () => {
    const source = code(COPY);

    expect(source).toMatch(/^"use client";/m);
    expect(source).not.toContain("next-intl");
    expect(source).toContain("readonly copyLabel: string;");
    expect(source).toContain("readonly copiedLabel: string;");
  });

  it("keeps one accessible name and announces the result beside it", () => {
    const source = code(COPY);
    const label = source.indexOf("aria-label={copyLabel}");
    const announcement = source.indexOf(`<output aria-live="polite"`);

    expect(label).toBeGreaterThan(-1);
    expect(announcement).toBeGreaterThan(label);
    expect(source).not.toContain("aria-label={copied");
  });

  it("shows the outcome as a glyph, driven from an attribute and not from colour", () => {
    const source = code(COPY);

    expect(source).toContain("data-copied={copied ?");
    expect(source).toContain("copy-icons");
    expect(source).toContain("copy-icon-idle");
    expect(source).toContain("copy-icon-done");
  });

  it("copies where the async clipboard is missing, and lies about nothing when it cannot", () => {
    const source = code(COPY);

    expect(source).toContain("navigator.clipboard");
    expect(source).toContain("execCommand");
    expect(source).toContain("if (!done) return;");
  });

  it("clears its timer on unmount", () => {
    expect(code(COPY)).toContain("clearTimeout(timer.current)");
  });
});

describe("the mounted section", () => {
  it("mounts the form in the slot it reserved, and stays a Server Component", () => {
    const source = code(SECTION);

    expect(source).toContain("import { ContactForm }");
    expect(source).toContain("<ContactForm ownerEmail={SITE.email} />");
    expect(source).not.toMatch(/^"use client";/m);
  });

  it("puts the copy control beside the address it copies, labels already translated", () => {
    const source = code(CHANNELS);

    expect(source).toContain("<CopyButton");
    expect(source).toContain("value={SITE.email}");
    expect(source).toContain(`copyLabel={common("copy")}`);
    expect(source).toContain(`copiedLabel={common("copied")}`);
    expect(source.indexOf("{SITE.email}")).toBeLessThan(source.indexOf("<CopyButton"));
  });
});

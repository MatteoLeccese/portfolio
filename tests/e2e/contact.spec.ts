// tests/e2e/contact.spec.ts
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { CONTACT_FIELDS, CONTACT_LIMITS, type ContactFieldName } from "@/domains/contact/types";

/**
 * The contact section, on both builds the project ships.
 *
 * NEXT_PUBLIC_USE_RESEND_EMAIL_FORM is inlined at build time: one server renders the form
 * and another renders the `mailto:` panel. playwright.config.ts declares both servers and
 * the projects that reach them. Each group below skips itself on the project whose build
 * does not render its subject.
 */

/** The project whose baseURL is the build that renders the form. */
const FORM_PROJECT = "desktop-contact-form";

const MESSAGES_DIR = fileURLToPath(new URL("../../messages/", import.meta.url));

const MAILTO_PREFIX = "mailto:";

/** The shape the configured address matches. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/** Cushion added to every wait on the server's fill-time gate. */
const GATE_MARGIN_MS = 300;

interface Route {
  locale: "en" | "es";
  path: string;
}

const ROUTES: readonly Route[] = [
  { locale: "en", path: "/" },
  { locale: "es", path: "/es" },
];

type MessageBag = Record<string, string>;

interface ContactCatalogue {
  errors: MessageBag;
  form: MessageBag;
  mail: MessageBag;
  status: MessageBag;
}

const catalogues = new Map<string, ContactCatalogue>();

/** The `Contact` namespace of one message catalogue, read from the file the app builds from. */
function contactMessages (locale: string): ContactCatalogue {
  const cached = catalogues.get(locale);
  if (cached !== undefined) return cached;

  const parsed = JSON.parse(
    readFileSync(`${MESSAGES_DIR}${locale}.json`, "utf8"),
  ) as { Contact: ContactCatalogue; };

  catalogues.set(locale, parsed.Contact);

  return parsed.Contact;
}

/** One message, and an error naming the key when the catalogue has no such entry. */
function message (bag: MessageBag, key: string): string {
  const value = bag[ key ];
  if (value === undefined) throw new Error(`Missing Contact message: ${key}`);

  return value;
}

/** The text one error code renders as in one locale. */
function errorText (locale: string, code: string): string {
  return message(contactMessages(locale).errors, code);
}

/**
 * A client address no other test shares. The action hashes the value and never parses it,
 * so every test lands in its own rate-limit bucket.
 */
function ownClientAddress (): string {
  return randomUUID();
}

function contactForm (page: Page): Locator {
  return page.getByTestId("contact-form");
}

function fieldOf (form: Locator, field: ContactFieldName): Locator {
  return form.locator(`[name="${field}"]`);
}

function submitButton (form: Locator, locale: string): Locator {
  return form.getByRole("button", { name: message(contactMessages(locale).form, "submit") });
}

/** Values every field accepts. */
const VALID_INPUT: Record<ContactFieldName, string> = {
  name: "Matteo Leccese",
  email: "visitor@example.com",
  subject: "A role on your team",
  message: "I would like to talk about a position on your team, if you have the time for it.",
};

async function fillValid (form: Locator): Promise<void> {
  for (const field of CONTACT_FIELDS) {
    await fieldOf(form, field).fill(VALID_INPUT[ field ]);
  }
}

/**
 * The clock reading the fill-time mark carries, once the effect that runs after hydration
 * has written it. Before that the form submits as a plain POST and runs no client rule.
 */
async function hydrationMark (form: Locator): Promise<number> {
  let mark = 0;

  await expect
    .poll(
      async () => {
        mark = Number(await form.locator(`[name="startedAt"]`).inputValue());

        return mark;
      },
      { message: "the form never wrote its fill-time mark, so it never hydrated" },
    )
    .toBeGreaterThan(0);

  return mark;
}

/**
 * Waits out the server's minimum fill time, counted from the moment the form marked itself
 * on hydration. A rejection after this point is never the timing rule.
 */
async function waitPastFillGate (form: Locator, markedAt: number): Promise<void> {
  const remaining = CONTACT_LIMITS.minFillMs - (Date.now() - markedAt);

  if (remaining > 0) await form.page().waitForTimeout(remaining + GATE_MARGIN_MS);
}

/** The node an invalid field points at with `aria-describedby`, and what it reads. */
async function expectFieldError (
  form: Locator,
  field: ContactFieldName,
  expected: string,
): Promise<void> {
  const input = fieldOf(form, field);

  await expect(input).toHaveAttribute("aria-invalid", "true");

  const errorId = await input.getAttribute("aria-describedby");
  expect(errorId, `${field} names no message with aria-describedby`).toBeTruthy();
  await expect(form.locator(`[id="${errorId}"]`)).toHaveText(expected);
}

/* ────────────────────────────────────────────────────────────────────────────
   The build that ships no form: NEXT_PUBLIC_USE_RESEND_EMAIL_FORM unset.
   ──────────────────────────────────────────────────────────────────────────── */

test.describe("Contact without the form", () => {
  test.skip(
    ({ }) => test.info().project.name === FORM_PROJECT,
    "This build renders the form instead of the mailto panel",
  );

  for (const { locale, path } of ROUTES) {
    test(`${locale}: renders the mailto panel and no form element at all`, async ({ page }) => {
      await page.goto(path);

      const panel = page.getByTestId("contact-mail");
      const mail = contactMessages(locale).mail;

      await expect(panel).toBeVisible();
      await expect(panel.getByRole("heading", { level: 3 })).toHaveText(message(mail, "title"));
      await expect(panel).toContainText(message(mail, "body"));
      await expect(panel).toContainText(message(mail, "note"));

      await expect(page.getByTestId("contact-form")).toHaveCount(0);
      await expect(page.locator("form")).toHaveCount(0);
      await expect(page.locator("input")).toHaveCount(0);
      await expect(page.locator("textarea")).toHaveCount(0);
    });

    test(`${locale}: the panel action is a mailto link carrying the configured address`, async ({ page }) => {
      await page.goto(path);

      const cta = page.getByTestId("contact-mail").getByRole("link");
      const href = await cta.getAttribute("href");

      expect(href, "the panel offers no link").not.toBeNull();
      expect(href).toContain(MAILTO_PREFIX);

      const address = (href ?? "").slice(MAILTO_PREFIX.length);
      expect(address).toMatch(EMAIL_PATTERN);

      const mail = contactMessages(locale).mail;

      await expect(cta).toHaveText(message(mail, "cta"));
      await expect(cta).toHaveAttribute(
        "aria-label",
        message(mail, "ctaAria").replace("{email}", address),
      );

      // The channels beside the panel publish the same address as visible text.
      await expect(page.getByRole("link", { exact: true, name: address })).toBeVisible();

      // One address for the whole page: no second one is rendered anywhere.
      const addresses = await page
        .locator(`a[href^="${MAILTO_PREFIX}"]`)
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));

      expect(addresses.length).toBeGreaterThan(1);
      expect([ ...new Set(addresses) ]).toEqual([ `${MAILTO_PREFIX}${address}` ]);
    });
  }
});

/* ────────────────────────────────────────────────────────────────────────────
   The build that ships the form: NEXT_PUBLIC_USE_RESEND_EMAIL_FORM is "true".
   ──────────────────────────────────────────────────────────────────────────── */

test.describe("Contact with the form", () => {
  test.skip(
    ({ }) => test.info().project.name !== FORM_PROJECT,
    "This build renders the mailto panel instead of the form",
  );

  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": ownClientAddress() });
  });

  for (const { locale, path } of ROUTES) {
    test(`${locale}: each field's rule shows its own message on blur`, async ({ page }) => {
      await page.goto(path);

      const form = contactForm(page);
      await hydrationMark(form);

      const cases: readonly { field: ContactFieldName; value: string; code: string; }[] = [
        { field: "name", value: "M", code: "name_too_short" },
        { field: "email", value: "visitor@", code: "email_invalid" },
        { field: "subject", value: "Hi", code: "subject_too_short" },
        { field: "message", value: "Too short to send.", code: "message_too_short" },
      ];

      for (const { field, value, code } of cases) {
        const input = fieldOf(form, field);

        await input.fill(value);
        await input.blur();
        await expectFieldError(form, field, errorText(locale, code));
      }

      // A value the rule accepts clears the message while the field is being typed in.
      await fieldOf(form, "name").fill(VALID_INPUT.name);
      await expect(fieldOf(form, "name")).not.toHaveAttribute("aria-invalid", "true");
    });

    test(`${locale}: whitespace alone counts as an empty field`, async ({ page }) => {
      await page.goto(path);

      const form = contactForm(page);
      await hydrationMark(form);

      const input = fieldOf(form, "name");
      await input.fill("   ");
      await input.blur();

      await expectFieldError(form, "name", errorText(locale, "name_too_short"));
    });

    test(`${locale}: a rejected submission is announced and takes the focus`, async ({ page }) => {
      await page.goto(path);

      const form = contactForm(page);
      await hydrationMark(form);

      // Submits every field empty, which noValidate passes straight to the server.
      await submitButton(form, locale).click();

      const status = page.getByTestId("contact-status");

      await expect(status).toHaveAttribute("data-state", "error");
      await expect(status).toHaveAttribute("data-code", "validation_error");
      await expect(status).toHaveAttribute("role", "alert");
      await expect(status).toHaveAttribute("aria-live", "assertive");
      await expect(status).toHaveText(errorText(locale, "validation_error"));

      const expectedCodes: Record<ContactFieldName, string> = {
        name: "name_too_short",
        email: "email_invalid",
        subject: "subject_too_short",
        message: "message_too_short",
      };

      for (const field of CONTACT_FIELDS) {
        await expectFieldError(form, field, errorText(locale, expectedCodes[ field ]));
      }

      // The first of the four, and never the trap field that precedes them in the DOM.
      await expect(fieldOf(form, "name")).toBeFocused();
    });
  }

  test("caps every field at the length its schema refuses to exceed", async ({ page }) => {
    await page.goto("/");

    const form = contactForm(page);
    const limits: Record<ContactFieldName, number> = {
      name: CONTACT_LIMITS.nameMax,
      email: CONTACT_LIMITS.emailMax,
      subject: CONTACT_LIMITS.subjectMax,
      message: CONTACT_LIMITS.messageMax,
    };

    for (const field of CONTACT_FIELDS) {
      await expect(fieldOf(form, field)).toHaveAttribute("maxlength", String(limits[ field ]));
    }
  });

  test("rejects a submission that fills the honeypot", async ({ page }) => {
    await page.goto("/");

    const form = contactForm(page);
    const markedAt = await hydrationMark(form);

    await fillValid(form);
    await form.locator(`[name="hp_field"]`).fill("https://example.com/spam");

    // Past the fill-time gate: the trap field is the only rule this submission breaks.
    await waitPastFillGate(form, markedAt);
    await submitButton(form, "en").click();

    const status = page.getByTestId("contact-status");

    await expect(status).toHaveAttribute("data-state", "error");
    await expect(status).toHaveAttribute("data-code", "spam_rejected");
    await expect(status).toHaveText(errorText("en", "spam_rejected"));
    await expect(page.getByTestId("contact-form")).toBeVisible();
  });

  test("accepts a valid submission while RESEND_API_KEY is empty", async ({ page }) => {
    await page.goto("/");

    const form = contactForm(page);
    const markedAt = await hydrationMark(form);

    await fillValid(form);
    await waitPastFillGate(form, markedAt);
    await submitButton(form, "en").click();

    const status = page.getByTestId("contact-status");
    const statusCopy = contactMessages("en").status;

    await expect(status).toHaveAttribute("data-state", "success");
    await expect(status).toContainText(message(statusCopy, "successTitle"));
    await expect(status).toContainText(message(statusCopy, "successBody"));
    await expect(status).toHaveAttribute("aria-live", "polite");

    // The confirmation takes the focus, and the fields it replaced are gone.
    await expect(status).toBeFocused();
    await expect(fieldOf(form, "name")).toHaveCount(0);

    // A success carries no error code.
    await expect(status).not.toHaveAttribute("data-code", /.*/u);
  });

  test("disables the fieldset while submitting and refuses a second submit", async ({ page }) => {
    await page.goto("/");

    const form = contactForm(page);
    const markedAt = await hydrationMark(form);

    await fillValid(form);
    await waitPastFillGate(form, markedAt);

    let posts = 0;
    let release = (): void => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    await page.route("**/*", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();

        return;
      }

      posts += 1;
      await held;
      await route.continue();
    });

    const submit = submitButton(form, "en");
    await submit.click();

    const pending = form.getByRole("button", {
      name: message(contactMessages("en").form, "submitting"),
    });

    // One disabled attribute on the fieldset, which every control inside it inherits.
    await expect(form.locator("fieldset")).toHaveAttribute("disabled", "");

    for (const field of CONTACT_FIELDS) {
      await expect(fieldOf(form, field)).toBeDisabled();
    }

    await expect(pending).toBeDisabled();
    await expect(pending).toHaveAttribute("aria-busy", "true");

    // Neither the pointer nor the keyboard can send the same message twice.
    await pending.click({ force: true });
    await page.keyboard.press("Enter");
    expect(posts).toBe(1);

    release();

    await expect(page.getByTestId("contact-status")).toHaveAttribute("data-state", "success");
    expect(posts).toBe(1);
  });
});

// src/domains/contact/services/mailer.test.ts
import { describe, expect, it, vi } from "vitest";

import {
  EMAIL_BRAND_COLOR,
  buildEmailSubject,
  renderContactEmail,
} from "@/domains/contact/services/mailer";
import type { ContactValues } from "@/domains/contact/types/schema";
import { PALETTE_SRGB } from "@/lib/palette-srgb";

vi.mock("server-only", () => ({}));

const RECEIVED_AT = "2026-09-11T10:00:00.000Z";

const VALUES: ContactValues = {
  name: "Matteo <script>alert(1)</script>",
  email: "visitor@example.com",
  subject: "Hola\nBcc: victim@example.com",
  message: "First paragraph.\n\nSecond paragraph.",
  locale: "es",
};

/** A copy of VALUES with the given fields replaced. */
function valuesWith (overrides: Partial<ContactValues>): ContactValues {
  return { ...VALUES, ...overrides };
}

describe("contact mailer html escaping", () => {
  it("escapes a script tag written in any field", () => {
    const { html } = renderContactEmail(VALUES, RECEIVED_AT);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("escapes quotes and angle brackets inside the message", () => {
    const message = "He said \"hello\" & wrote <b>bold</b> for me, twice over.";
    const { html } = renderContactEmail(valuesWith({ message }), RECEIVED_AT);
    expect(html).toContain(
      "He said &quot;hello&quot; &amp; wrote &lt;b&gt;bold&lt;/b&gt; for me, twice over.",
    );
    expect(html).not.toContain("<b>bold</b>");
  });

  it("escapes a quote that would close an attribute", () => {
    const name = "\"><img src=x onerror=alert(1)>";
    const { html } = renderContactEmail(valuesWith({ name }), RECEIVED_AT);
    expect(html).not.toContain("<img");
    expect(html).toContain("&quot;&gt;&lt;img src=x onerror=alert(1)&gt;");
  });

  it("escapes single quotes and ampersands", () => {
    const subject = "Tom & Jerry's plan";
    const { html } = renderContactEmail(valuesWith({ subject }), RECEIVED_AT);
    expect(html).toContain("Tom &amp; Jerry&#39;s plan");
  });

  it("escapes the visitor address", () => {
    const email = "a<b>@example.com";
    const { html } = renderContactEmail(valuesWith({ email }), RECEIVED_AT);
    expect(html).toContain("a&lt;b&gt;@example.com");
  });

  it("escapes the received timestamp", () => {
    const { html } = renderContactEmail(VALUES, "<em>now</em>");
    expect(html).toContain("&lt;em&gt;now&lt;/em&gt;");
    expect(html).not.toContain("<em>");
  });

  it("carries the locale into the lang attribute", () => {
    expect(renderContactEmail(VALUES, RECEIVED_AT).html).toContain("lang=\"es\"");
    expect(renderContactEmail(valuesWith({ locale: "en" }), RECEIVED_AT).html).toContain("lang=\"en\"");
  });
});

describe("contact mailer plain text part", () => {
  it("keeps the paragraphs in the plain text version", () => {
    const { text } = renderContactEmail(VALUES, RECEIVED_AT);
    expect(text).toContain("First paragraph.\n\nSecond paragraph.");
    expect(text).not.toContain("<p ");
    expect(text).not.toContain("style=");
  });

  it("carries the sender, the address and the subject", () => {
    const { text } = renderContactEmail(VALUES, RECEIVED_AT);
    expect(text).toContain("From: Matteo <script>alert(1)</script> <visitor@example.com>");
    expect(text).toContain("Subject: Hola Bcc: victim@example.com");
  });

  it("is never empty for a single-line message", () => {
    const message = "One line only, no blank line anywhere in it.";
    const { text } = renderContactEmail(valuesWith({ message }), RECEIVED_AT);
    expect(text).toContain(message);
    expect(text.trim().length).toBeGreaterThan(0);
  });

  it("renders a body paragraph for a message padded with blank lines", () => {
    const message = "\n\n   Padded body with enough characters.   \n\n";
    const { html, text } = renderContactEmail(valuesWith({ message }), RECEIVED_AT);
    expect(text).toContain("Padded body with enough characters.");
    expect(html).toContain("Padded body with enough characters.</p>");
  });

  it("leaves the html entities out of the plain text part", () => {
    const { text } = renderContactEmail(valuesWith({ message: "Tom & Jerry wrote a long message." }), RECEIVED_AT);
    expect(text).toContain("Tom & Jerry wrote a long message.");
    expect(text).not.toContain("&amp;");
  });
});

describe("contact mailer subject", () => {
  it("collapses the subject to a single line", () => {
    expect(buildEmailSubject(VALUES.subject)).toBe("[portfolio] Hola Bcc: victim@example.com");
  });

  it("collapses carriage returns and repeated breaks", () => {
    expect(buildEmailSubject("a\r\nb\n\n\nc")).toBe("[portfolio] a b c");
  });

  it("trims the leading and trailing breaks instead of leaving a gap", () => {
    expect(buildEmailSubject("\n  Hello  \n")).toBe("[portfolio] Hello");
  });

  it("keeps the html subject on a single line too", () => {
    const { html } = renderContactEmail(VALUES, RECEIVED_AT);
    expect(html).toContain(">Hola Bcc: victim@example.com</p>");
  });
});

describe("contact mailer palette", () => {
  it("uses the brand colour and no gradient at all", () => {
    const { html } = renderContactEmail(VALUES, RECEIVED_AT);
    expect(html).toContain(EMAIL_BRAND_COLOR);
    expect(html.toLowerCase()).not.toContain("gradient");
  });

  it("keeps the email green anchored to the sRGB mirror of the palette", () => {
    expect(EMAIL_BRAND_COLOR).toBe(PALETTE_SRGB.light.primary);
  });
});

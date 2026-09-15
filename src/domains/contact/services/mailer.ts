// src/domains/contact/services/mailer.ts
import "server-only";

import { type CreateEmailResponse, Resend } from "resend";

import type { ContactValues } from "@/domains/contact/types/schema";

/** sRGB equivalent of --primary in light mode (--brand-700). Single source of truth for the email green. */
export const EMAIL_BRAND_COLOR = "#1c7f4c";

const EMAIL_PAGE_COLOR = "#f8fbf9";
const EMAIL_SURFACE_COLOR = "#ffffff";
const EMAIL_BORDER_COLOR = "#e2e8e4";
const EMAIL_TEXT_COLOR = "#161a17";
const EMAIL_MUTED_COLOR = "#636b66";

const LABEL_STYLE = `margin:0 0 2px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_MUTED_COLOR};`;
const VALUE_STYLE = `margin:0 0 16px;font-size:15px;line-height:22px;color:${EMAIL_TEXT_COLOR};`;
const BODY_STYLE = `margin:0 0 12px;font-size:15px;line-height:24px;color:${EMAIL_TEXT_COLOR};`;

const SUBJECT_PREFIX = "[portfolio] ";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
};

/** The two parts of one contact email. */
export interface RenderedEmail {
  html: string;
  text: string;
}

function requireEnv (name: string): string {
  const value = process.env[ name ];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

/** Replaces `& < > " '` with their HTML entities. */
function escapeHtml (value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[ char ] ?? char);
}

/** Collapses every line break into a space and trims the result. */
function singleLine (value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/** Splits the message on blank lines and drops the empty blocks. */
function paragraphsOf (message: string): string[] {
  const blocks = message
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
  if (blocks.length > 0) return blocks;
  const fallback = message.trim();
  return fallback.length > 0 ? [ fallback ] : [];
}

function messageOf (cause: unknown): string {
  return cause instanceof Error ? cause.message : "unknown error";
}

/** Removes the API key from a string that is about to be thrown or logged. */
function redactApiKey (text: string, apiKey: string): string {
  return apiKey.length > 0 ? text.split(apiKey).join("[redacted]") : text;
}

/** The prefixed subject, collapsed to a single line. */
export function buildEmailSubject (subject: string): string {
  return `${SUBJECT_PREFIX}${singleLine(subject)}`;
}

/** The HTML and plain-text parts of the notification, with every visitor value escaped. */
export function renderContactEmail (values: ContactValues, receivedAt: string): RenderedEmail {
  const paragraphs = paragraphsOf(values.message);
  const locale = escapeHtml(values.locale);
  const stamp = escapeHtml(singleLine(receivedAt));
  const name = escapeHtml(values.name);
  const email = escapeHtml(values.email);
  const subject = escapeHtml(singleLine(values.subject));
  const body = paragraphs
    .map((paragraph) => `<p style="${BODY_STYLE}">${escapeHtml(paragraph)}</p>`)
    .join("");

  const html = `<!doctype html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="color-scheme" content="light"><title>Portfolio contact</title></head>
<body style="margin:0;padding:24px;background-color:${EMAIL_PAGE_COLOR};font-family:Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background-color:${EMAIL_SURFACE_COLOR};border:1px solid ${EMAIL_BORDER_COLOR};border-radius:8px;">
<tr><td style="padding:32px;">
<h1 style="margin:0 0 4px;font-size:18px;line-height:26px;color:${EMAIL_BRAND_COLOR};">New message from the portfolio</h1>
<p style="margin:0 0 24px;font-size:13px;color:${EMAIL_MUTED_COLOR};">${stamp} &middot; ${locale}</p>
<p style="${LABEL_STYLE}">From</p>
<p style="${VALUE_STYLE}">${name} &lt;${email}&gt;</p>
<p style="${LABEL_STYLE}">Subject</p>
<p style="${VALUE_STYLE}">${subject}</p>
<p style="${LABEL_STYLE}">Message</p>
${body}
<hr style="border:0;border-top:1px solid ${EMAIL_BORDER_COLOR};margin:24px 0;">
<p style="margin:0;font-size:12px;color:${EMAIL_MUTED_COLOR};">Reply to this email to answer ${name}.</p>
</td></tr></table>
</td></tr></table>
</body>
</html>`;

  const text = [
    "New message from the portfolio",
    `${singleLine(receivedAt)} · ${values.locale}`,
    "",
    `From: ${singleLine(values.name)} <${singleLine(values.email)}>`,
    `Subject: ${singleLine(values.subject)}`,
    "",
    paragraphs.join("\n\n"),
    "",
    "--",
    `Reply to this email to answer ${singleLine(values.name)}.`,
  ].join("\n");

  return { html, text };
}

/**
 * Delivers one contact message through Resend. Throws an Error carrying no API key when
 * the environment is incomplete or the provider refuses the send.
 */
export async function sendContactEmail (values: ContactValues): Promise<void> {
  const receivedAt = new Date().toISOString();
  const { html, text } = renderContactEmail(values, receivedAt);
  const from = requireEnv("CONTACT_FROM_EMAIL");
  const to = requireEnv("CONTACT_TO_EMAIL");
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[contact] DRY RUN: RESEND_API_KEY is empty, the message was not delivered.");
    return;
  }

  let response: CreateEmailResponse;
  try {
    response = await new Resend(apiKey).emails.send({
      from,
      to,
      replyTo: values.email,
      subject: buildEmailSubject(values.subject),
      html,
      text,
      headers: { "X-Entity-Ref-ID": receivedAt },
    });
  } catch (cause: unknown) {
    throw new Error(`Resend request failed: ${redactApiKey(messageOf(cause), apiKey)}`);
  }

  const { error } = response;
  if (error) {
    throw new Error(`Resend error: ${error.name} — ${redactApiKey(error.message, apiKey)}`);
  }
}

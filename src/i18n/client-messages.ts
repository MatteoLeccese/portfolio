// src/i18n/client-messages.ts
import type { Messages } from "next-intl";

/**
 * The only namespaces that reach the browser. Three islands need `t` at runtime:
 *   - Contact: ContactForm renders t.rich for the privacy notice and the two rescue
 *     errors, which interpolate a React element, and builds t(`errors.${code}`) from a
 *     code the server chose.
 *   - Locale: LocaleSwitcher composes t("switchTo", { language: t(other) }) with the
 *     endonym of the other language, which depends on the anchor being rendered.
 *   - Theme: ThemeToggle keeps both labels in the DOM and lets the `dark:` variant
 *     decide, so it needs the two of them.
 *
 * Every other island receives already-translated strings by prop.
 */
export function clientMessages (messages: Messages): Pick<Messages, "Contact" | "Locale" | "Theme"> {
  return {
    Contact: messages.Contact,
    Locale: messages.Locale,
    Theme: messages.Theme,
  };
}

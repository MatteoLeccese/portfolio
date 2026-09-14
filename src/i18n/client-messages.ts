// src/i18n/client-messages.ts
import type { Messages } from "next-intl";

/**
 * The only namespaces that reach the browser.
 *
 * Three islands need `t` at runtime, each for a reason that a resolved string cannot
 * cover:
 *   - Contact: ContactForm renders t.rich for the privacy notice and for the two rescue
 *     errors, which interpolate a React element, and it builds t(`errors.${code}`) from a
 *     code the SERVER chose, so it cannot know in advance which of the 13 it needs.
 *   - Locale: LocaleSwitcher composes t("switchTo", { language: t(other) }) with the
 *     endonym of the OTHER language, which depends on which anchor is being rendered.
 *   - Theme: ThemeToggle keeps both labels in the DOM and lets the `dark:` variant decide,
 *     so it needs the two of them, not the one the server would have picked.
 *
 * Every other island receives already-translated strings by prop (section 5.10).
 *
 * Written as an explicit object and not as a `pick()` over an array of names: three
 * properties do not justify a helper, and this way there is not a single type assertion.
 */
export function clientMessages (messages: Messages): Pick<Messages, "Contact" | "Locale" | "Theme"> {
  return {
    Contact: messages.Contact,
    Locale: messages.Locale,
    Theme: messages.Theme,
  };
}

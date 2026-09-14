// src/domains/core/config/cookies.ts
import type { LocalizedText } from "@/domains/core/types";
import { THEME_COOKIE_NAME } from "@/lib/theme";

/**
 * A cookie as the cookie policy describes it. `name` is the literal name the browser
 * stores and is the same in every language; every other field is localized prose.
 */
export interface CookieDescriptor {
  name: string;
  provider: LocalizedText;
  purpose: LocalizedText;
  duration: LocalizedText;
  type: LocalizedText;
}

/**
 * The cookies this site sets. `CookieTable` renders this array, and
 * tests/e2e/cookies.spec.ts asserts that every cookie a real browser receives is listed
 * here. `{domain}` is resolved at render time by resolveSitePlaceholders().
 */
export const COOKIE_REGISTRY: readonly CookieDescriptor[] = [
  {
    name: THEME_COOKIE_NAME,
    provider: {
      en: "{domain} (first party)",
      es: "{domain} (primera parte)",
    },
    purpose: {
      en: "Remembers whether you chose the light or the dark theme, so the site looks the way you left it. It is created only when you use the theme switch.",
      es: "Recuerda si elegiste el tema claro o el oscuro, para que el sitio se vea como lo dejaste. Se crea únicamente cuando usas el conmutador de tema.",
    },
    duration: { en: "1 year", es: "1 año" },
    type: {
      en: "Preference (exempt from consent)",
      es: "Preferencia (exenta de consentimiento)",
    },
  },
  // NEXT_LOCALE is absent because routing.ts sets `localeCookie: false`, so next-intl never
  // writes it. Enabling that flag means adding a row here: a first-party preference cookie
  // that stores the selected language for one year, exempt from consent.
];

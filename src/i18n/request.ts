// src/i18n/request.ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Per-request i18n configuration.
 *
 * The fixed time zone is not cosmetic: `useFormatter().dateTime()` runs on the server at
 * build time and again in the browser on hydration. Without a fixed zone the two runs use
 * different offsets and React reports a hydration mismatch on the legal pages, whose only
 * formatted value is a date.
 *
 * An unknown locale falls back to the default HERE, and is rejected with notFound() in
 * `app/[locale]/layout.tsx`, which is the only place that can tell a 404 apart from a
 * render outside `[locale]`. This function also runs for `app/not-found.tsx`, where
 * `requestLocale` is undefined by design: calling notFound() here would make the root 404
 * recurse instead of rendering. There is no silent fallback in the routing surface — the
 * proxy already 404s `/fr` — only in the place where it cannot cause one.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "America/Caracas",
  };
});

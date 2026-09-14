// src/i18n/request.ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Per-request i18n configuration: the resolved locale, its message catalogue and a fixed
 * time zone.
 *
 * The time zone is fixed so that `useFormatter().dateTime()` renders the same string on
 * the server at build time and in the browser on hydration.
 *
 * An unknown locale falls back to the default here. Rejecting it belongs to
 * `app/[locale]/layout.tsx`: this function also runs for `app/not-found.tsx`, where
 * `requestLocale` is undefined by design.
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

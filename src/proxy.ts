// src/proxy.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Next 16 renamed `middleware.ts` to `proxy.ts`. The next-intl factory is still imported
 * from "next-intl/middleware". Having both files fails the build with error E900.
 *
 * There is deliberately NO route allow-list here. The standard middleware already produces
 * the right behaviour: "/" 200, "/es" 200, "/en" 307 to "/", "/privacy" 200, "/en/privacy"
 * 307 to "/privacy", anything else a real 404. The v2 allow-list ("everything that is not
 * / or /es redirects to /") turned every unknown URL into a soft 404 and blocked the legal
 * routes.
 */
export default createMiddleware(routing);

export const config = {
  // Metadata routes are excluded: with localePrefix "as-needed", /en/opengraph-image would
  // be 307-redirected to /opengraph-image and the English OG card would stop being served.
  matcher: [
    "/((?!api|_next|_vercel|.*/(?:opengraph-image|twitter-image|icon|apple-icon)$|.*\\..*).*)",
  ],
};

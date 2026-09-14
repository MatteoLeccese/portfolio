// src/proxy.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Locale routing proxy, with no route allow-list. Serves "/" and "/es" as 200, redirects
 * "/en" to "/" and "/en/privacy" to "/privacy" with a 307, and 404s anything unknown.
 */
export default createMiddleware(routing);

export const config = {
  // Matches every path except API, framework internals, metadata image routes and files
  // with an extension.
  matcher: [
    "/((?!api|_next|_vercel|.*/(?:opengraph-image|twitter-image|icon|apple-icon)$|.*\\..*).*)",
  ],
};

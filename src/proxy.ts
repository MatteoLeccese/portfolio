import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "./i18n/routing";

const handle = createMiddleware(routing);

/**
 * Header next-intl sets on the request it rewrites internally. Its presence means locale
 * routing already ran for this request.
 */
const ALREADY_ROUTED = "x-next-intl-locale";

/**
 * Locale routing. Serves "/" and "/es" as 200, redirects "/en" to "/" and "/en/privacy"
 * to "/privacy" with a 307, and 404s anything unknown.
 *
 * The standalone server runs middleware again on the path next-intl rewrote to, so a
 * request for "/" is seen a second time as "/en" and would be redirected back to "/".
 * Requests carrying the header are passed through untouched.
 */
export default function proxy (request: NextRequest) {
  if (request.headers.has(ALREADY_ROUTED)) return NextResponse.next();

  return handle(request);
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*/(?:opengraph-image|twitter-image|icon|apple-icon)$|.*\\..*).*)",
  ],
};

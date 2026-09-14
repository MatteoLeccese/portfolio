// next.config.ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next injects inline bootstrap scripts. A nonce would force dynamic rendering
  // and kill full SSG. Rationale and migration criteria live in section 10.
  // 'unsafe-eval' is DEV ONLY: the Turbopack runtime and React Refresh evaluate
  // hot modules. Without it, `next dev` boots with HMR blocked by our own CSP.
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  // data: is needed by the OG card: satori inlines the logo as a data URI.
  "font-src 'self' data:",
  // ws: is DEV ONLY: the HMR socket.
  `connect-src 'self'${isProduction ? "" : " ws:"}`,
  "form-action 'self'",
  "frame-ancestors 'none'",
  // frame-ancestors says who may embed US; frame-src says what WE may embed: nothing.
  "frame-src 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isProduction ? [ "upgrade-insecure-requests" ] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()", "autoplay=()", "browsing-topics=()", "camera=()",
      "display-capture=()", "encrypted-media=()", "geolocation=()", "gyroscope=()",
      "magnetometer=()", "microphone=()", "midi=()", "payment=()",
      "picture-in-picture=()", "publickey-credentials-get=()", "screen-wake-lock=()",
      "usb=()", "xr-spatial-tracking=()",
    ].join(", "),
  },
  // HSTS in production only. On http://localhost it does nothing useful and, if a local
  // service ever shared the hostname over plain HTTP, the browser would refuse it for two
  // years. The header is what the section 10 table describes; the condition is here.
  ...(isProduction
    ? [ { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" } ]
    : []),
];

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    serverActions: { bodySizeLimit: "64kb" },
  },
  outputFileTracingIncludes: {
    "/[locale]/opengraph-image": [
      "./src/lib/assets/fonts/*.ttf",
      "./public/logo/*.png",
    ],
  },
  async headers () {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The CV is regenerated from time to time: revalidate, never cache forever.
        // It carries a phone number: the site ranks, the PDF does not.
        source: "/cv/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=3600, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, noarchive" },
        ],
      },
      {
        // Generated, content-addressed by name: safe to freeze.
        source: "/icons/:path*",
        headers: [ { key: "Cache-Control", value: "public, max-age=31536000, immutable" } ],
      },
    ];
  },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);

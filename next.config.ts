// next.config.ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline' covers the inline bootstrap scripts Next injects. 'unsafe-eval' is
  // added outside production only, for the Turbopack runtime and React Refresh.
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  // data: is needed by the OG card, which inlines the logo as a data URI.
  "font-src 'self' data:",
  // ws: is added outside production only, for the HMR socket.
  `connect-src 'self'${isProduction ? "" : " ws:"}`,
  "form-action 'self'",
  "frame-ancestors 'none'",
  // frame-ancestors controls who may embed this site; frame-src controls what it may embed.
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
  // HSTS is sent in production only.
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
        // The CV is revalidated rather than cached forever, and is kept out of search indexes.
        source: "/cv/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=3600, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, noarchive" },
        ],
      },
      {
        // Generated files, content-addressed by name, cached immutably.
        source: "/icons/:path*",
        headers: [ { key: "Cache-Control", value: "public, max-age=31536000, immutable" } ],
      },
    ];
  },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);

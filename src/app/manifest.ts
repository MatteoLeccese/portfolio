// src/app/manifest.ts
import type { MetadataRoute } from "next";
import { SITE } from "@/domains/core/config/site";
import { PALETTE_SRGB, THEME_COLOR_SRGB } from "@/lib/palette-srgb";

/**
 * /manifest.webmanifest. Five fields and three icons: the two `any` sizes Android picks
 * the home-screen icon from and one `maskable` variant.
 *
 * `theme_color` is the value the pre-paint script writes into <meta name="theme-color">
 * for the light theme, so the browser chrome and the page agree on the first paint.
 * `background_color` is the light page background, which is the same colour.
 *
 * The favicon, the modern icon and the Apple touch icon are not listed here: they are
 * file-convention files under src/app and Next links them from the head.
 */
export default function manifest (): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    start_url: "/",
    theme_color: THEME_COLOR_SRGB.light,
    background_color: PALETTE_SRGB.light.background,
    icons: [
      {
        src: "/icons/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

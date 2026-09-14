// src/lib/palette-srgb.ts
/**
 * sRGB renderings of the oklch tokens in globals.css. The oklch value is the
 * source of truth; these exist only for consumers that cannot resolve oklch:
 * satori (next/og), the web app manifest and the CV/e-mail templates.
 * palette-srgb.test.ts keeps them in sync.
 *
 * This is one of the two declared exceptions to "no literal colour outside globals.css"
 * (the other is the e-mail template of §10). Only layer 2 — the semantic names — is
 * mirrored: layer 1 (brand-700, neutral-200…) lives in CSS and never leaves it.
 */
export const PALETTE_SRGB = {
  light: {
    background: "#f8fbf9",
    foreground: "#161a17",
    card: "#ffffff",
    primary: "#1c7f4c",
    primaryForeground: "#ffffff",
    muted: "#f0f5f2",
    mutedForeground: "#636b66",
    border: "#e2e8e4",
    accent: "#def8e6",
    accentForeground: "#19643c",
  },
  dark: {
    background: "#090c0a",
    foreground: "#f8fbf9",
    primary: "#63d18f",
    primaryForeground: "#082e19",
  },
} as const;

/**
 * The two values <meta name="theme-color"> can take. Derived from the same object, so a
 * rebrand cannot move the page background without moving the browser chrome with it.
 *
 * It is a separate export, and not a lookup at the call site, because THEME_INIT_SCRIPT
 * (src/lib/theme.ts) interpolates both values into a string at build time and ThemeToggle
 * indexes it with the next theme. This module must NOT import `Theme` from theme.ts: that
 * would close a cycle, since theme.ts already imports this one.
 */
export const THEME_COLOR_SRGB: { light: string; dark: string; } = {
  light: PALETTE_SRGB.light.background,
  dark: PALETTE_SRGB.dark.background,
};

// src/lib/palette-srgb.ts
/**
 * sRGB renderings of the oklch tokens in globals.css, for the consumers that cannot resolve
 * oklch: satori (next/og), the web app manifest and the CV and e-mail templates. The oklch
 * value is the source of truth and palette-srgb.test.ts keeps the two in sync.
 *
 * Only the semantic names are mirrored; the primitive scales (brand-700, neutral-200…) stay
 * in CSS.
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
 * The two values <meta name="theme-color"> can take, each one the page background of its
 * theme. THEME_INIT_SCRIPT interpolates both into a string at build time and ThemeToggle
 * indexes this object with the next theme. The key type is written out rather than imported
 * from theme.ts.
 */
export const THEME_COLOR_SRGB: { light: string; dark: string; } = {
  light: PALETTE_SRGB.light.background,
  dark: PALETTE_SRGB.dark.background,
};

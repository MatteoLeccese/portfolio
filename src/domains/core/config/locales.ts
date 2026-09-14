// src/domains/core/config/locales.ts

/**
 * Root of the locale graph. This module has no imports on purpose: every other module
 * that needs to know which languages exist depends on this one, never the other way
 * round. Adding a locale starts here and the type system propagates the consequences.
 */
export const LOCALES = [ "en", "es" ] as const;

export const DEFAULT_LOCALE = "en";

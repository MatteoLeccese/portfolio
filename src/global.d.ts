// src/global.d.ts
import type { Locale } from "./domains/core/types";
import type messages from "../messages/en.json";

/**
 * Compile-time safety for next-intl. `en.json` is the source of truth for keys: a call to
 * t("Nope.key") is a tsc error, not a runtime fallback.
 *
 * This types keys against English only. That `es.json` has the same keys is guaranteed by
 * src/i18n/messages.test.ts, not by the compiler.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}

/**
 * Ambient declaration for simple-icons, which publishes one named export per icon
 * (siReact, siNextdotjs, ...). Types the module as a lookup from export name to icon, so
 * it can be indexed with a name built at runtime from a slug.
 */
declare module "simple-icons" {
  interface SimpleIcon {
    readonly title: string;
    readonly slug: string;
    readonly path: string;
    readonly hex: string;
  }

  const icons: { readonly [exportName: string]: SimpleIcon | undefined; };

  export = icons;
}

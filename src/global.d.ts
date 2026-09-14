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
 * simple-icons publishes one named export per icon (siReact, siNextdotjs, ...), and
 * scripts/generate-skill-icons.ts has to look them up by a name it builds at runtime from
 * the slug. TypeScript cannot index a module namespace object with a computed string, and
 * the usual workaround is `as unknown as`, which this project bans (section 12.2).
 * Declaring the shape we actually consume is the honest version of the same escape: it is
 * written down once, in the file whose job is exactly this, and it is reviewed.
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

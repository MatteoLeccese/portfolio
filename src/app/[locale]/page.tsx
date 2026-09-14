// src/app/[locale]/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NAV_SECTION_IDS, type SectionId } from "@/domains/core/config/navigation";
import { SITE } from "@/domains/core/config/site";
import type { Locale } from "@/domains/core/types";
import { routing } from "@/i18n/routing";

/**
 * The one-page home: seven <section> elements in the order of SECTION_IDS, each with its
 * id, its landmark and its heading. The outline is the one axe, the scroll spy and screen
 * readers read: a single <h1>, an <h2> per section with no level skipped, and an
 * aria-labelledby on every <section> pointing at its own heading.
 *
 * It declares no metadata and inherits the layout's, which already is the home's.
 */

/** Prerenders / and /es at build time. */
export function generateStaticParams () {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * The six section titles, by section id. The hero is absent: its <h1> is the owner's
 * name and not a `<Namespace>.title` key. NAV_SECTION_IDS is SECTION_IDS minus the hero,
 * so adding a section without a title here is a type error.
 */
const SECTION_TITLE_KEY = {
  about: "About.title",
  skills: "Skills.title",
  experience: "Experience.title",
  education: "Education.title",
  projects: "Projects.title",
  contact: "Contact.title",
} as const satisfies Record<Exclude<SectionId, "hero">, string>;

export default async function HomePage ({
  params,
}: {
  // `Locale` and not `string`: the layout has already turned anything else away with
  // notFound() by the time this page renders.
  params: Promise<{ locale: Locale; }>;
}) {
  const { locale } = await params;

  setRequestLocale(locale);

  /*
   * Read from the root of the catalogue rather than with a namespace: the six titles
   * live in six different namespaces. The locale is already fixed by setRequestLocale
   * above.
   */
  const t = await getTranslations();

  return (
    <>
      <section id="hero" aria-labelledby="hero-title" className="container-page section-y">
        <h1 id="hero-title" className="text-display text-foreground">{SITE.name}</h1>
      </section>

      {NAV_SECTION_IDS.map((id) => (
        <section
          key={id}
          id={id}
          aria-labelledby={`${id}-title`}
          className="container-page section-y"
        >
          <h2 id={`${id}-title`} className="text-h2 text-foreground">{t(SECTION_TITLE_KEY[ id ])}</h2>
        </section>
      ))}
    </>
  );
}

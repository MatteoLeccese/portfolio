// src/app/[locale]/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NAV_SECTION_IDS, type SectionId } from "@/domains/core/config/navigation";
import { SITE } from "@/domains/core/config/site";
import type { Locale } from "@/domains/core/types";
import { routing } from "@/i18n/routing";

/**
 * The one-page, phase 2 (§14.6): the seven <section> elements exist, in the order of
 * SECTION_IDS, with their ids, their landmarks and their headings. Their content arrives
 * in phase 6 (§14.10), one component per section.
 *
 * "Empty" is not the same as "structureless". What is already final here is the document
 * outline that §11.9.1 fixes and that axe, the scroll spy and every screen reader depend
 * on: one <h1> and only one, a <h2> per section with no level skipped, and an
 * aria-labelledby on every <section> pointing at its own heading, which is what turns it
 * into a named region. Getting that right later, on top of seven populated sections, is
 * how heading-order bugs are born.
 *
 * This page declares NO metadata (§11.3.1): it inherits the layout's, which already IS
 * the home's. It does declare generateStaticParams and call setRequestLocale, because
 * §8.4 requires both of every page under [locale]; a page that skips setRequestLocale
 * turns its route dynamic in silence and only the build output says so.
 */

/** Prerenders / and /es at build time. Every page under [locale] declares it (§8.4). */
export function generateStaticParams () {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * The six section titles, by section id.
 *
 * The hero is absent on purpose: its <h1> is the owner's name (§11.9.1), not a section
 * title, and it is the only heading on the page that does not come from a
 * `<Namespace>.title` key. NAV_SECTION_IDS is exactly SECTION_IDS minus the hero, so the
 * two lists cannot drift: adding a section to §5 config without a title here is a type
 * error.
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
  // `Locale` and not `string` (§11.3.3): setRequestLocale only takes a known locale, and by
  // the time this page renders the layout has already refused anything else with notFound().
  // Repeating the guard here would buy nothing and would suggest the layout's is optional.
  params: Promise<{ locale: Locale; }>;
}) {
  const { locale } = await params;

  setRequestLocale(locale);

  /*
   * Read from the root of the catalogue and not with a namespace: the six titles live in
   * six different namespaces and one binding is cheaper than six. The locale is already
   * fixed by setRequestLocale above. An invalid locale never reaches this line — the
   * layout's hasLocale() guard runs first, and the proxy 404s before that.
   */
  const t = await getTranslations();

  return (
    <>
      {/*
        PHASE 6 (§14.10) replaces the body of every <section> below with its component,
        and moves the id from the <section> to the SectionHeading it renders (§6.10.8):
        the heading block owns the id and the `scroll-mt-header` that compensates the
        fixed header, and the <section> keeps only aria-labelledby. Two elements with the
        same id is invalid HTML and the scroll spy would observe the wrong one, so that is
        a move, never a copy. The hero keeps its id on the <section>: it has an <h1>, not
        a SectionHeading.
      */}
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

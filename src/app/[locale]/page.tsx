// src/app/[locale]/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Reveal } from "@/components/motion/Reveal";
import { ContactSection } from "@/domains/contact/components/ContactSection";
import { SITE } from "@/domains/core/config/site";
import { buildHomeGraph } from "@/domains/core/seo/graphs";
import { JsonLd } from "@/domains/core/seo/JsonLd";
import type { Locale } from "@/domains/core/types";
import { yearsOfExperienceAt } from "@/domains/core/utils/period";
import { EducationSection } from "@/domains/education/components/EducationSection";
import { education } from "@/domains/education/content/education";
import { ExperienceSection } from "@/domains/experience/components/ExperienceSection";
import { experience } from "@/domains/experience/content/experience";
import { AboutSection } from "@/domains/profile/components/AboutSection";
import { HeroSection } from "@/domains/profile/components/HeroSection";
import { getCurrentPosition } from "@/domains/profile/queries/getCurrentPosition";
import { getJobTitle } from "@/domains/profile/queries/getJobTitle";
import { ProjectsSection } from "@/domains/projects/components/ProjectsSection";
import { SkillsSection } from "@/domains/skills/components/SkillsSection";
import { skillCategories } from "@/domains/skills/content/skills";
import { routing } from "@/i18n/routing";

/**
 * The one-page home: the seven sections of SECTION_IDS, in that order.
 *
 * The locale, the ongoing position and the years figure are resolved once here and passed
 * down as props. Each anchor id lives on exactly one element: the hero writes it on its
 * own <section>, the other six write it on their SectionHeading.
 *
 * It declares no metadata and inherits the layout's, which already is the home's. It
 * injects the route's own JSON-LD graph: ProfilePage, Person and WebSite.
 */

/** Prerenders / and /es at build time. */
export function generateStaticParams () {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Seconds a prerendered home stays valid. Every fact this page derives from the clock —
 * the years of experience, the duration of the current position, the copyright year — is
 * recomputed on each re-render.
 */
export const revalidate = 86_400;

export default async function HomePage ({
  params,
}: {
  params: Promise<{ locale: Locale; }>;
}) {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations("Hero");
  const meta = await getTranslations({ locale, namespace: "Meta" });

  // The ongoing position, or null while there is none, and the role and employer it names.
  const current = getCurrentPosition(experience);
  const role = getJobTitle(current, locale);
  const company = current?.company ?? null;

  const years = yearsOfExperienceAt(SITE.careerStart, new Date());

  const heroRole = company === null
    ? t("betweenRoles")
    : t("currentRole", { role });

  // The single degree the CV lists, or null once the entry is removed.
  const degree = education[ 0 ];

  const graph = buildHomeGraph(locale, {
    title: meta("title", { name: SITE.name, role }),
    description: meta("description", { role, years }),
    jobTitle: role,
    knowsAbout: skillCategories.flatMap((category) => category.skills.map((skill) => skill.name)),
    currentEmployer: company,
    alumniOf: degree === undefined
      ? null
      : { name: degree.institution, alternateName: degree.institutionShort },
  });

  return (
    <>
      <HeroSection
        greeting={t("greeting")}
        headline={t("headline")}
        locale={locale}
        name={SITE.name}
        primaryCta={t("primaryCta")}
        role={heroRole}
        scrollCue={t("scrollCue")}
        secondaryCta={t("secondaryCta")}
        summary={t("summary", { years })}
      />

      <AboutSection company={company} role={role} years={years} />

      <SkillsSection />

      <ExperienceSection locale={locale} />

      <EducationSection locale={locale} />

      <ProjectsSection locale={locale} />

      {/* The reveal of the Contact section, which declares no animation of its own. */}
      <Reveal>
        <ContactSection />
      </Reveal>

      <JsonLd graph={graph} />
    </>
  );
}

// src/domains/projects/components/ProjectsSection.tsx
import { getTranslations } from "next-intl/server";

import { SectionHeading } from "@/components/common/SectionHeading";
import { Stagger } from "@/components/motion/Stagger";
import type { Locale } from "@/domains/core/types";
import { ProjectCard } from "@/domains/projects/components/ProjectCard";
import { ProjectsEmptyState } from "@/domains/projects/components/ProjectsEmptyState";
import { projects } from "@/domains/projects/content/projects";
import type { Project } from "@/domains/projects/types";

interface ProjectsSectionProps {
  readonly locale: Locale;
}

/** Featured entries first. Inside each group the order of the content file is kept. */
function ordered (entries: readonly Project[]): Project[] {
  return [ ...entries ].sort((a, b) => Number(b.featured) - Number(a.featured));
}

/**
 * The Projects section: one card per entry of the content file, or the empty state while
 * there are none.
 *
 * The branch is the whole component. Adding the first project fills the grid, replaces the
 * panel and gives the section its nav entry without touching a line of this file.
 */
export async function ProjectsSection ({ locale }: ProjectsSectionProps) {
  const t = await getTranslations("Projects");
  const entries = ordered(projects);

  return (
    <section aria-labelledby="projects-title" className="container-page section-y">
      <SectionHeading id="projects" subtitle={t("subtitle")} title={t("title")} />

      {entries.length === 0
        ? <ProjectsEmptyState className="mt-10" />
        : (
          <Stagger as="ul" className="mt-10 grid gap-6 md:grid-cols-2" step="base">
            {entries.map((project) => (
              <ProjectCard key={project.slug} locale={locale} project={project} />
            ))}
          </Stagger>
        )}
    </section>
  );
}

// src/domains/projects/components/ProjectCard.tsx
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { ExternalLink } from "@/components/common/ExternalLink";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/domains/core/types";
import { localize } from "@/domains/core/utils/localize";
import type { Project, ProjectLinks } from "@/domains/projects/types";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  readonly project: Project;
  readonly locale: Locale;
}

/** The single destination of the card: the live site, else the repository, else the case study. */
function primaryHref (links: ProjectLinks): string | undefined {
  return links.live ?? links.repo ?? links.caseStudy;
}

/**
 * One project, as a card: the screenshot, the name and the year, the summary, the role
 * when there is one, and the stack.
 *
 * The name is the card's only link and it stretches over the whole surface, which is what
 * earns the card `card-interactive`. A project with no link at all renders the same card
 * without either. `cover: null` renders no media area rather than a broken image.
 */
export async function ProjectCard ({ project, locale }: ProjectCardProps) {
  const t = await getTranslations("Common");
  const href = primaryHref(project.links);
  const { cover } = project;

  return (
    <li data-reveal="hidden">
      <article
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-xl border border-hairline",
          "bg-card text-card-foreground shadow-elevation-1",
          href === undefined ? undefined : "card-interactive",
        )}
        data-slot="project-card"
      >
        {cover === null
          ? null
          : (
            <Image
              alt={localize(cover.alt, locale)}
              className="aspect-video w-full object-cover"
              height={cover.height}
              sizes="(min-width: 768px) 50vw, 100vw"
              src={cover.src}
              width={cover.width}
            />
          )}

        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <h3 className="text-h3 text-foreground">
              {href === undefined
                ? project.name
                : (
                  <ExternalLink
                    className="text-foreground after:absolute after:inset-0 after:content-['']"
                    href={href}
                  >
                    {project.name}
                  </ExternalLink>
                )}
            </h3>

            <Badge variant="hairline">{project.year}</Badge>
          </div>

          <p className="text-body text-muted-foreground">{localize(project.summary, locale)}</p>

          {project.role === undefined
            ? null
            : <p className="text-meta text-muted-foreground">{localize(project.role, locale)}</p>}

          <div className="mt-auto flex flex-col gap-2 pt-2">
            <p className="text-eyebrow text-muted-foreground uppercase">{t("stack")}</p>

            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground">
              {project.tech.map((name) => <li key={name}>{name}</li>)}
            </ul>
          </div>
        </div>
      </article>
    </li>
  );
}

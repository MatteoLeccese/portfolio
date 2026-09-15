// src/domains/experience/components/ExperienceItem.tsx
import { ChevronDown } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ExternalLink } from "@/components/common/ExternalLink";
import { Stagger } from "@/components/motion/Stagger";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CompanyLogo } from "@/domains/experience/components/CompanyLogo";
import type { LocalizedExperience } from "@/domains/experience/types";
import { cn } from "@/lib/utils";

interface ExperienceItemProps {

  /** Already translated. The accessible wording of the ongoing position. */
  readonly currentLabel: string;
  readonly entry: LocalizedExperience;

  /** Already translated. Heads the bullet list of the card. */
  readonly responsibilitiesLabel: string;
}

/** Bullets shown before the disclosure takes over on a narrow viewport. */
const PEEK = 3;

const BULLETS = "list-disc space-y-2 ps-5 text-body text-muted-foreground marker:text-muted-foreground";

const DISCLOSURE = [
  "flex min-h-touch w-full cursor-pointer list-none items-center gap-2 rounded-md",
  "text-meta font-medium text-foreground",
  "transition-colors duration-fast ease-standard hover:text-primary",
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-2",
  "[&::-webkit-details-marker]:hidden",
].join(" ");

/**
 * One position of the timeline, as a card: the company mark, the role, the period and its
 * duration and the stack on one side, the summary and the bullet list on the other.
 *
 * It renders neither the <li> nor the dot on the rail: the surrounding <Reveal as="li"> is
 * the list item, and it is also what registers the card with the reveal observer.
 *
 * From `md` every bullet is rendered in the one list; below it the list shows the first
 * three and a native <details> holds the rest, so the disclosure needs no JavaScript and no
 * second island. The prose keeps the site measure at every width, and from `lg` the card
 * splits the facts and the story into two columns.
 */
export async function ExperienceItem ({ currentLabel, entry, responsibilitiesLabel }: ExperienceItemProps) {
  const t = await getTranslations("Common");
  const overflow = entry.highlights.slice(PEEK);

  return (
    <Card className="px-6 lg:grid lg:grid-cols-3 lg:items-start lg:gap-x-10">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <CompanyLogo company={entry.company} logo={entry.logo} />

          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h3 className="text-h3 text-foreground">{entry.role}</h3>

              {entry.isCurrent
                ? (
                  <>
                    <Badge aria-hidden="true" variant="accent">{t("current")}</Badge>
                    <span className="sr-only">{currentLabel}</span>
                  </>
                )
                : null}
            </div>

            <p className="text-body font-medium text-foreground">
              {entry.companyUrl === null
                ? entry.company
                : (
                  <ExternalLink className="text-foreground" href={entry.companyUrl}>
                    {entry.company}
                  </ExternalLink>
                )}
            </p>

            <p className="text-meta text-muted-foreground">{entry.periodLabel}</p>
            <p className="text-meta text-muted-foreground">{entry.durationLabel}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-eyebrow text-muted-foreground uppercase">{t("stack")}</p>

          <ul className="flex flex-wrap gap-2">
            {entry.stack.map((technology) => (
              <li key={technology}>
                <Badge variant="hairline">{technology}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex max-w-readable flex-col gap-5 lg:col-span-2">
        <p className="text-body text-foreground">{entry.summary}</p>

        <div className="flex flex-col gap-3">
          <h4 className="text-eyebrow text-muted-foreground uppercase">{responsibilitiesLabel}</h4>

          <Stagger as="ul" className={BULLETS} step="base">
            {entry.highlights.map((highlight, index) => (
              <li
                className={index < PEEK ? undefined : "hidden md:list-item"}
                data-reveal="hidden"
                key={highlight}
              >
                {highlight}
              </li>
            ))}
          </Stagger>

          {overflow.length === 0
            ? null
            : (
              <details className="group md:hidden">
                <summary className={DISCLOSURE}>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4 transition-transform duration-base ease-standard group-open:rotate-180 motion-reduce:transition-none"
                  />

                  <span className="group-open:hidden">
                    {t("showAll", { count: entry.highlights.length })}
                  </span>

                  <span className="hidden group-open:inline">{t("showLess")}</span>
                </summary>

                <ul className={cn(BULLETS, "mt-3")}>
                  {overflow.map((highlight) => <li key={highlight}>{highlight}</li>)}
                </ul>
              </details>
            )}
        </div>
      </div>
    </Card>
  );
}

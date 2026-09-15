// src/domains/projects/components/ProjectsEmptyState.tsx
import { DraftingCompass } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ExternalLink } from "@/components/common/ExternalLink";
import { Reveal } from "@/components/motion/Reveal";
import { buttonVariants } from "@/components/ui/button";
import type { SectionId } from "@/domains/core/config/navigation";
import { SITE } from "@/domains/core/config/site";
import { cn } from "@/lib/utils";

interface ProjectsEmptyStateProps {
  readonly className?: string;
}

/** Where the primary action goes. Typed, so renaming the section is a build error. */
const EXPERIENCE_ANCHOR: SectionId = "experience";

/**
 * What the Projects section renders while the content file holds no entries: one panel
 * with the surface, border and radius of a real project card, a kicker, a statement, the
 * reason behind it and two ways on — the work history and the GitHub profile.
 *
 * The icon carries `empty-state-icon` and sits inside the `data-reveal` element, which is
 * what chains its scale onto the panel's reveal; without JavaScript both stay visible.
 */
export async function ProjectsEmptyState ({ className }: ProjectsEmptyStateProps) {
  const t = await getTranslations("Projects");

  return (
    <Reveal
      className={cn(
        "flex flex-col items-start gap-6 rounded-xl border border-hairline bg-card",
        "p-6 text-card-foreground shadow-elevation-1 md:p-10 lg:p-12",
        className,
      )}
    >
      <span className="empty-state-icon flex size-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <DraftingCompass aria-hidden="true" className="size-6" />
      </span>

      <div className="flex flex-col gap-3">
        <p className="text-eyebrow text-primary uppercase">{t("emptyKicker")}</p>
        <h3 className="text-h3 text-foreground">{t("emptyTitle")}</h3>
        <p className="max-w-readable text-body text-muted-foreground">{t("emptyBody")}</p>
      </div>

      <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
        <a className={buttonVariants()} href={`#${EXPERIENCE_ANCHOR}`}>{t("emptyPrimaryCta")}</a>

        <ExternalLink
          className={cn(buttonVariants({ variant: "outline" }), "hover:no-underline")}
          href={SITE.github}
        >
          {t("emptySecondaryCta")}
        </ExternalLink>
      </div>
    </Reveal>
  );
}

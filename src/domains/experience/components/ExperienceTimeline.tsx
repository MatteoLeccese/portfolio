// src/domains/experience/components/ExperienceTimeline.tsx
import { Reveal } from "@/components/motion/Reveal";
import { ExperienceItem } from "@/domains/experience/components/ExperienceItem";
import { TimelineProgress } from "@/domains/experience/components/TimelineProgress";
import type { LocalizedExperience } from "@/domains/experience/types";
import { cn } from "@/lib/utils";

/**
 * The dot of one entry, centred on the rail. The offsets track the inline padding the
 * `.timeline` box sets, which is what the rail is positioned against.
 */
const DOT = [
  "absolute -start-7.5 top-10.5 size-3 rounded-full",
  "bg-brand-600 ring-4 ring-background md:-start-11.5",
].join(" ");

interface ExperienceTimelineProps {
  readonly className?: string;

  /** Already translated. The accessible wording of the ongoing position. */
  readonly currentLabel: string;
  readonly entries: readonly LocalizedExperience[];

  /** Already translated. Heads the bullet list of every card. */
  readonly responsibilitiesLabel: string;
}

/**
 * The rail, the scroll-linked fill that runs over it, one dot per entry and one card per
 * position, in the order the content gives them.
 *
 * The rail and the fill are siblings of the <ol> and not children of it, so the list holds
 * nothing but its own items. Every entry is wrapped in <Reveal as="li">, which is both the
 * list item and the registration with the reveal observer; the cards themselves render on
 * the server. The dot is positioned against that list item, whose inline edge is where the
 * `.timeline` padding ends.
 */
export function ExperienceTimeline ({
  className,
  currentLabel,
  entries,
  responsibilitiesLabel,
}: ExperienceTimelineProps) {
  return (
    <div className={cn("timeline md:ps-12", className)}>
      <span aria-hidden="true" className="timeline-rail" />
      <TimelineProgress />

      <ol className="flex flex-col gap-6 md:gap-8">
        {entries.map((entry, index) => (
          <Reveal as="li" className="relative" key={entry.id} step={index}>
            <span aria-hidden="true" className={DOT} />

            <ExperienceItem
              currentLabel={currentLabel}
              entry={entry}
              responsibilitiesLabel={responsibilitiesLabel}
            />
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

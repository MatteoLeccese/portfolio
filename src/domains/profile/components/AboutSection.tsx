// src/domains/profile/components/AboutSection.tsx
import { BriefcaseBusiness, CalendarDays, Languages, MapPin, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Prose } from "@/components/common/Prose";
import { SectionHeading } from "@/components/common/SectionHeading";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { Stagger } from "@/components/motion/Stagger";
import type { SectionId } from "@/domains/core/config/navigation";
import { SITE } from "@/domains/core/config/site";

/** The anchor the nav, the scroll spy and the hero's scroll cue point at. */
const SECTION_ID: SectionId = "about";

/**
 * Stands in for the years figure while the fact line is formatted, so the number can be
 * wrapped on its own afterwards. It is a private-use code point: no catalogue contains it
 * and no font paints it.
 */
export const YEARS_SLOT = "\uE000";

interface AboutSectionProps {

  /** yearsOfExperienceAt(SITE.careerStart, new Date()), resolved in app/. */
  readonly years: number;

  /** getJobTitle(getCurrentPosition(experience), locale), resolved in app/. */
  readonly role: string;

  /** The current employer, or null while there is no ongoing position. */
  readonly company: string | null;
}

interface Fact {
  readonly id: string;
  readonly Icon: LucideIcon;
  readonly text: ReactNode;
}

/**
 * Splits `text` into the part before and the part after `slot`. Returns null unless the
 * slot occurs exactly once.
 */
export function splitAroundSlot (text: string, slot: string): readonly [ string, string ] | null {
  const parts = text.split(slot);

  if (parts.length !== 2) return null;

  return [ parts[ 0 ] ?? "", parts[ 1 ] ?? "" ];
}

/**
 * The years fact with its figure wrapped in a counter. Falls back to the plain number
 * when the slot is missing, so the line always reads correctly.
 */
function countedYears (formatted: string, years: number): ReactNode {
  const parts = splitAroundSlot(formatted, YEARS_SLOT);

  if (parts === null) return formatted.replaceAll(YEARS_SLOT, String(years));

  return (
    <>
      {parts[ 0 ]}
      <span className="font-semibold text-foreground tabular-nums">
        <CountUp to={years}>{years}</CountUp>
      </span>
      {parts[ 1 ]}
    </>
  );
}

/**
 * The About section: three paragraphs of running text and a strip of four facts.
 *
 * Every figure in the strip is derived — the years from the clock, the role and the
 * employer from the experience model, the place from SITE — and none is written here.
 * Each fact is a self-contained sentence and the icon beside it is decorative.
 */
export function AboutSection ({ years, role, company }: AboutSectionProps) {
  const t = useTranslations("About");
  const place = `${SITE.location.region}, ${SITE.location.countryName}`;

  const facts: readonly Fact[] = [
    {
      id: "experience",
      Icon: CalendarDays,
      text: countedYears(t("factExperience", { years: YEARS_SLOT }), years),
    },
    {
      id: "role",
      Icon: BriefcaseBusiness,
      text: company === null ? t("factRoleNone") : t("factRole", { role }),
    },
    { id: "location", Icon: MapPin, text: t("factLocation", { location: place }) },
    { id: "languages", Icon: Languages, text: t("factLanguages") },
  ];

  return (
    <section
      aria-labelledby={`${SECTION_ID}-title`}
      className="container-page section-y flex flex-col gap-10 md:gap-14"
    >
      <Reveal className="flex flex-col gap-8">
        <SectionHeading id={SECTION_ID} title={t("title")} />

        <Prose>
          <p className="text-lead">{t("paragraphOne", { role, years })}</p>
          <p>{t("paragraphTwo")}</p>
          <p>{t("paragraphThree", { location: place })}</p>
        </Prose>
      </Reveal>

      {/* Every direct child carries data-reveal itself: Stagger observes the group. */}
      <Stagger as="ul" className="grid gap-x-10 md:grid-cols-2" step="base">
        {facts.map(({ id, Icon, text }) => (
          <li className="hairline-t flex items-start gap-3 py-5" data-reveal="hidden" key={id}>
            <Icon aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />
            <span className="text-body text-foreground">{text}</span>
          </li>
        ))}
      </Stagger>
    </section>
  );
}

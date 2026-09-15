// src/domains/profile/components/HeroSection.tsx
import { ArrowDown } from "lucide-react";
import { Fragment, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import type { SectionId } from "@/domains/core/config/navigation";
import type { Locale } from "@/domains/core/types";

import { DownloadCvButton } from "./DownloadCvButton";
import { SocialLinks } from "./SocialLinks";

/** The anchor the header wordmark points at. The nav itself starts at #about. */
const SECTION_ID: SectionId = "hero";

interface HeroSectionProps {

  /** Which CV PDF the download link points at. */
  readonly locale: Locale;

  /** Already translated, all of them. This component never calls useTranslations. */
  readonly greeting: string;
  readonly name: string;

  /** The role line: Hero.currentRole resolved, or Hero.betweenRoles. */
  readonly role: string;
  readonly headline: string;
  readonly summary: string;
  readonly primaryCta: string;
  readonly secondaryCta: string;
  readonly scrollCue: string;
}

/**
 * The hero, and the only place the --hero-index sequence is written.
 *
 * The <h1> carries .hero-title and no --hero-index: it animates transform only, never
 * opacity, and it starts at 0 ms. The six other elements carry .hero-item and an explicit
 * --hero-index, 0 to 5 with no gaps; the index is not a delay, the CSS multiplies it by
 * --motion-stagger-loose.
 *
 * The role line splits into words on the server, so the full text reaches the HTML. The
 * space between two words sits outside the clipped box, where it is not collapsed away.
 */
export function HeroSection ({
  locale,
  greeting,
  name,
  role,
  headline,
  summary,
  primaryCta,
  secondaryCta,
  scrollCue,
}: HeroSectionProps) {
  const words = role.split(" ");

  return (
    <section
      aria-labelledby={`${SECTION_ID}-title`}
      className="container-page section-y flex flex-col gap-10 md:gap-12"
      id={SECTION_ID}
    >
      <div className="flex flex-col gap-4 md:gap-5">
        <p
          className="hero-item text-eyebrow text-primary uppercase"
          style={{ "--hero-index": 0 } as CSSProperties}
        >
          {greeting} {name}
        </p>

        <h1
          className="hero-title text-display text-foreground text-balance"
          id={`${SECTION_ID}-title`}
        >
          {headline}
        </h1>

        <p
          className="hero-item hero-words text-lead text-muted-foreground"
          style={{ "--hero-index": 1 } as CSSProperties}
        >
          {words.map((word, index) => (
            <Fragment key={`${word}-${index}`}>
              <span className="hero-word-clip">
                <span className="hero-word" style={{ "--word-index": index } as CSSProperties}>
                  {word}
                </span>
              </span>
              {index < words.length - 1 ? " " : null}
            </Fragment>
          ))}
        </p>
      </div>

      {/* Hairline divider: identity above it, supporting content below. */}
      <div className="hairline-t flex flex-col gap-8 pt-10 md:gap-10 md:pt-12">
        <p
          className="hero-item max-w-readable text-body text-muted-foreground text-pretty"
          style={{ "--hero-index": 2 } as CSSProperties}
        >
          {summary}
        </p>

        <div
          className="hero-item flex flex-col gap-3 md:flex-row md:items-center md:gap-4"
          style={{ "--hero-index": 3 } as CSSProperties}
        >
          <Button nativeButton={false} render={<a href="#contact" />}>{primaryCta}</Button>
          <Button nativeButton={false} render={<a href="#experience" />} variant="subtle">
            {secondaryCta}
          </Button>
          <DownloadCvButton locale={locale} />
        </div>

        <div className="hero-item" style={{ "--hero-index": 4 } as CSSProperties}>
          <SocialLinks />
        </div>
      </div>

      <a
        className="hero-item touch-target inline-flex items-center gap-2 self-start text-meta text-muted-foreground transition-colors duration-fast ease-standard hover:text-foreground"
        href="#about"
        style={{ "--hero-index": 5 } as CSSProperties}
      >
        <ArrowDown aria-hidden="true" className="scroll-cue-icon size-4" />
        {scrollCue}
      </a>
    </section>
  );
}

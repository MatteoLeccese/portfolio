// src/components/common/SectionHeading.tsx

interface SectionHeadingProps {

  /** Section id. It is the scroll-spy target, the anchor in the nav and the URL hash. */
  readonly id: string;

  /** Already translated. This component never calls useTranslations. */
  readonly title: string;
  readonly subtitle?: string;

  /** Short kicker above the title. Optional. */
  readonly eyebrow?: string;
}

/**
 * The heading of a home section, and the only place its id is written.
 *
 * The id goes on this element and NOT on the <section>, because scroll-mt-header has to
 * apply to whatever the browser scrolls to: putting the id on the section would land the
 * anchor at the top of its padding and the heading would sit under the fixed header.
 * The caller wires `aria-labelledby={`${id}-title`}` on its <section>; the <h2> carries
 * that id, so the accessible name of the region is the visible title.
 */
export function SectionHeading ({ id, title, subtitle, eyebrow }: SectionHeadingProps) {
  return (
    <div className="scroll-mt-header flex flex-col gap-3" id={id}>
      {eyebrow === undefined
        ? null
        : <p className="text-eyebrow text-primary uppercase">{eyebrow}</p>}
      <h2 className="text-h2 text-foreground" id={`${id}-title`}>{title}</h2>
      {subtitle === undefined
        ? null
        : <p className="max-w-readable text-lead text-muted-foreground text-pretty">{subtitle}</p>}
    </div>
  );
}

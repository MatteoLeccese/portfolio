// src/domains/education/components/EducationItem.tsx
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/domains/core/types";
import { localize } from "@/domains/core/utils/localize";
import type { EducationEntry } from "@/domains/education/types";

interface EducationItemProps {
  readonly entry: EducationEntry;
  readonly locale: Locale;
}

/**
 * One education entry as a full-width card: the degree as an h3, the institution and the
 * place under it, and the year as a badge at the end of the row.
 *
 * The <li> carries `data-reveal="hidden"`, which the surrounding <Stagger> needs on every
 * direct child. The card is not a link, so it does not carry `card-interactive`.
 */
export function EducationItem ({ entry, locale }: EducationItemProps) {
  return (
    <li data-reveal="hidden">
      <Card className="gap-4 px-6 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-h3 text-foreground">{localize(entry.degree, locale)}</h3>

          <p className="text-body text-foreground">
            {entry.institution}
            <span className="text-muted-foreground"> ({entry.institutionShort})</span>
          </p>

          <p className="text-meta text-muted-foreground">{entry.location}</p>
        </div>

        <Badge variant="hairline">{entry.year}</Badge>
      </Card>
    </li>
  );
}

// src/components/common/Prose.tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ProseProps {

  /**
   * Running text as plain HTML. `p`, `ul`, `ol`, `li`, `a` and `strong` are styled by this
   * wrapper and need no classes of their own.
   */
  readonly children: ReactNode;

  /** Layout classes for the wrapper. The typography inside belongs to this component. */
  readonly className?: string;
}

/**
 * The container for long-form text: reading measure, vertical rhythm, list markers and
 * link styling.
 *
 * The rules are descendant selectors, so they reach through whatever element the caller
 * nests inside, and they are written as `:not(:first-child)` top margins, so a block never
 * opens with a gap and nothing has to be reset. Headings keep their own size class: this
 * wrapper only spaces them.
 *
 * The wrapper sets the body type scale and no text colour: `twMerge` files `text-body` in
 * the same conflict group as a `text-<colour>` utility and keeps only the last of the two,
 * and the colour of running text is already the `body` rule's.
 */
export function Prose ({ children, className }: ProseProps) {
  return (
    <div
      className={cn(
        "max-w-readable text-body",
        "[&_p:not(:first-child)]:mt-5",
        "[&_ul:not(:first-child)]:mt-5 [&_ol:not(:first-child)]:mt-5",
        "[&_h2:not(:first-child)]:mt-10 [&_h3:not(:first-child)]:mt-8",
        "[&_section:not(:first-child)]:mt-10",
        "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-5 [&_ol]:ps-5",
        "[&_li:not(:first-child)]:mt-2 [&_li::marker]:text-muted-foreground",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
        "[&_a]:decoration-primary/40 [&_a]:transition-colors",
        "[&_a]:duration-fast [&_a]:ease-standard",
        "[&_a:hover]:text-primary-hover [&_a:hover]:decoration-primary",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

// src/domains/skills/components/AiWorkflowPanel.tsx
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

/** The name of a practice, set on its own line above the sentence that explains it. */
function term (chunks: ReactNode) {
  return <strong className="block font-semibold text-foreground">{chunks}</strong>;
}

function Practice ({ children }: { readonly children: ReactNode; }) {
  return <li className="hairline-t pt-4 text-body text-muted-foreground">{children}</li>;
}

/**
 * The first block of the skill section: how the work is done with AI agents, as text.
 *
 * It carries no logos. Two of the three tools it names have no brand glyph, and a row of
 * AI logos would say less than the three practices do. The heading is an <h3> under the
 * <h2> of the section, and the panel is addressable as #ai-workflow without being a
 * navigation entry.
 */
export async function AiWorkflowPanel () {
  const t = await getTranslations("Skills");

  return (
    <article
      aria-labelledby="ai-workflow-title"
      className="rounded-xl border border-hairline bg-card p-6 text-card-foreground shadow-elevation-1 md:p-8"
      id="ai-workflow"
    >
      <h3 className="text-h3" id="ai-workflow-title">{t("categoryAi")}</h3>
      <p className="mt-4 max-w-readable text-body text-muted-foreground">{t("aiIntro")}</p>
      <ul className="mt-8 grid gap-6 md:grid-cols-3">
        <Practice>{t.rich("aiPracticeOne", { term })}</Practice>
        <Practice>{t.rich("aiPracticeTwo", { term })}</Practice>
        <Practice>{t.rich("aiPracticeThree", { term })}</Practice>
      </ul>
      <p className="mt-8 text-meta text-muted-foreground">{t("aiTooling")}</p>
    </article>
  );
}

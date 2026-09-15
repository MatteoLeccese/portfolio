// src/domains/contact/components/ContactMailPanel.tsx
import { Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { SITE } from "@/domains/core/config/site";
import { cn } from "@/lib/utils";

/**
 * The contact path that carries no form: one panel whose single action is a `mailto:`
 * link to the address SITE publishes.
 *
 * It takes the surface, border, radius and elevation of a card, and the action is a real
 * anchor with the primary button treatment, so it is focusable and followable from the
 * keyboard. Its accessible name opens with the visible label and ends with the address
 * the link points at. Nothing here is submitted: the visitor's own mail client composes
 * and sends the message.
 */
export async function ContactMailPanel () {
  const t = await getTranslations("Contact.mail");

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-6 rounded-xl border border-hairline bg-card",
        "p-6 text-card-foreground shadow-elevation-1 md:p-8",
      )}
      data-testid="contact-mail"
    >
      <span className="flex size-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Mail aria-hidden="true" className="size-6" />
      </span>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3 text-foreground">{t("title")}</h3>
        <p className="max-w-readable text-body text-muted-foreground">{t("body")}</p>
      </div>

      <a
        aria-label={t("ctaAria", { email: SITE.email })}
        className={cn(buttonVariants({ size: "lg" }), "max-w-full")}
        href={`mailto:${SITE.email}`}
      >
        {t("cta")}
      </a>

      <p className="max-w-readable text-meta text-muted-foreground">{t("note")}</p>
    </div>
  );
}

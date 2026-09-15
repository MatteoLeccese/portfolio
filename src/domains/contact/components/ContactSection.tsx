// src/domains/contact/components/ContactSection.tsx
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { SectionHeading } from "@/components/common/SectionHeading";
import { ContactChannels } from "@/domains/contact/components/ContactChannels";
import { ContactForm } from "@/domains/contact/components/ContactForm";
import { SITE } from "@/domains/core/config/site";
import { cn } from "@/lib/utils";

interface ContactSectionProps {

  /**
   * The contact form. It is the slot the form mounts into: with it the section is two
   * columns from `md`, three fifths for the form and two for the channels, and the form
   * comes first in the DOM. It defaults to ContactForm, addressed to the owner.
   */
  readonly form?: ReactNode;
}

/**
 * The Contact section: the heading, the lead line and the direct channels, around the slot
 * the form mounts into.
 *
 * The anchor id lives on SectionHeading, and the section declares no animation of its own.
 */
export async function ContactSection ({
  form = <ContactForm ownerEmail={SITE.email} />,
}: ContactSectionProps) {
  const t = await getTranslations("Contact");
  const hasForm = form !== undefined;

  return (
    <section aria-labelledby="contact-title" className="container-page section-y">
      <SectionHeading id="contact" subtitle={t("subtitle")} title={t("title")} />

      <div className={cn("mt-10 grid gap-10", hasForm && "md:grid-cols-5 md:gap-12")}>
        {hasForm ? <div className="md:col-span-3">{form}</div> : null}

        <div className={cn(hasForm && "md:col-span-2")}>
          <ContactChannels />
        </div>
      </div>
    </section>
  );
}

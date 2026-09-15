// src/domains/contact/components/ContactSection.tsx
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { SectionHeading } from "@/components/common/SectionHeading";
import { ContactChannels } from "@/domains/contact/components/ContactChannels";
import { ContactForm } from "@/domains/contact/components/ContactForm";
import { ContactMailPanel } from "@/domains/contact/components/ContactMailPanel";
import { SITE, USE_RESEND_EMAIL_FORM } from "@/domains/core/config/site";

interface ContactSectionProps {

  /**
   * What mounts into the wide column while USE_RESEND_EMAIL_FORM is true. It defaults to
   * ContactForm, addressed to the owner, and is ignored on the build that ships no form.
   */
  readonly form?: ReactNode;
}

/**
 * The Contact section: the heading, the lead line and the direct channels, around the way
 * this build offers to write.
 *
 * USE_RESEND_EMAIL_FORM chooses between the two: the Resend-backed form, or the panel
 * whose only action is a `mailto:` link. Both components are present in the client bundle
 * in either configuration. Either way the wide column holds the path and comes first in
 * the DOM, and the channels follow in the narrow one.
 *
 * The anchor id lives on SectionHeading, and the section declares no animation of its own.
 */
export async function ContactSection ({ form }: ContactSectionProps) {
  const t = await getTranslations("Contact");

  return (
    <section aria-labelledby="contact-title" className="container-page section-y">
      <SectionHeading id="contact" subtitle={t("subtitle")} title={t("title")} />

      <div className="mt-10 grid gap-10 md:grid-cols-5 md:gap-12">
        <div className="md:col-span-3">
          {USE_RESEND_EMAIL_FORM
            ? (form ?? <ContactForm ownerEmail={SITE.email} />)
            : <ContactMailPanel />}
        </div>

        <div className="md:col-span-2">
          <ContactChannels />
        </div>
      </div>
    </section>
  );
}

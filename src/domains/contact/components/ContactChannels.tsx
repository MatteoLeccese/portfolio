// src/domains/contact/components/ContactChannels.tsx
import { getTranslations } from "next-intl/server";

import { ExternalLink } from "@/components/common/ExternalLink";
import { SocialIcon } from "@/components/common/SocialIcon";
import { SITE } from "@/domains/core/config/site";
import { cn } from "@/lib/utils";

const CHANNEL_LINK_CLASS = "text-primary transition-colors duration-fast ease-standard hover:text-primary-hover";

const MAIL_LINK_CLASS = "underline underline-offset-4 decoration-primary/40 hover:decoration-primary";

/**
 * The direct channels: the email address in the clear, LinkedIn and GitHub.
 *
 * Every destination comes from SITE, so this domain reads no content of its own. The
 * glyphs are hidden from assistive technology and the link beside each one carries the
 * accessible name. The phone number is never rendered here.
 */
export async function ContactChannels () {
  const t = await getTranslations("Contact.channels");

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-h3 text-foreground">{t("title")}</h3>

      <ul className="flex flex-col gap-3">
        <li className="flex flex-wrap items-center gap-3">
          <SocialIcon className="shrink-0 text-muted-foreground" icon="mail" />
          <a className={cn(CHANNEL_LINK_CLASS, MAIL_LINK_CLASS)} href={`mailto:${SITE.email}`}>
            {SITE.email}
          </a>
        </li>

        <li className="flex items-center gap-3">
          <SocialIcon className="shrink-0 text-muted-foreground" icon="linkedin" />
          <ExternalLink className={CHANNEL_LINK_CLASS} href={SITE.linkedin}>
            {t("linkedinLabel")}
          </ExternalLink>
        </li>

        <li className="flex items-center gap-3">
          <SocialIcon className="shrink-0 text-muted-foreground" icon="github" />
          <ExternalLink className={CHANNEL_LINK_CLASS} href={SITE.github}>
            {t("githubLabel")}
          </ExternalLink>
        </li>
      </ul>
    </div>
  );
}

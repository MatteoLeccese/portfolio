// src/app/[locale]/opengraph-image.tsx
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import { createTranslator } from "next-intl";
import { getTranslations } from "next-intl/server";

import { DEFAULT_LOCALE } from "@/domains/core/config/locales";
import { SITE, SITE_DOMAIN } from "@/domains/core/config/site";
import type { Locale } from "@/domains/core/types";
import { experience } from "@/domains/experience/content/experience";
import { getCurrentPosition } from "@/domains/profile/queries/getCurrentPosition";
import { getJobTitle } from "@/domains/profile/queries/getJobTitle";
import { routing } from "@/i18n/routing";
import { PALETTE_SRGB } from "@/lib/palette-srgb";

import englishMessages from "../../../messages/en.json";

/**
 * The social card, one per locale: a band of --primary, the monogram over the domain, the
 * name, the role, the tagline and three chips, on the light theme background. Every surface
 * is flat and every colour is a literal from PALETTE_SRGB, which satori needs because it
 * resolves neither CSS variables nor oklch.
 *
 * `alt`, `size` and `contentType` are constants and not the return of generateImageMetadata,
 * which appends the image id to the path. The route is therefore /{locale}/opengraph-image,
 * the shape src/proxy.ts excludes from the locale redirect, and `alt` is one string for both
 * locales.
 */

const SIZE = { width: 1200, height: 630 };
const CONTENT_TYPE = "image/png";
const COLOR = PALETTE_SRGB.light;

const FONT_DIR = join(process.cwd(), "src", "lib", "assets", "fonts");

const MONOGRAM = "ML";

/** The localized job title, the same one the pages and the JSON-LD name. */
function jobTitle (locale: Locale): string {
  return getJobTitle(getCurrentPosition(experience), locale);
}

export const size = SIZE;
export const contentType = CONTENT_TYPE;

export const alt = createTranslator({
  locale: DEFAULT_LOCALE,
  messages: englishMessages,
  namespace: "OpenGraph",
})("imageAlt", { name: SITE.name, role: jobTitle(DEFAULT_LOCALE) });

/** Prerenders one card per locale at build time. */
export function generateStaticParams () {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Reads one of the two static instances of Montserrat. satori parses neither WOFF2 nor
 * Montserrat-Variable.ttf, whose `fvar` table throws in its font parser.
 *
 * @param file A file name inside src/lib/assets/fonts/.
 */
async function loadFont (file: string): Promise<ArrayBuffer> {
  const bytes = await readFile(join(FONT_DIR, file));
  return Uint8Array.from(bytes).buffer;
}

export default async function OpengraphImage ({
  params,
}: {
  params: Promise<{ locale: Locale; }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "OpenGraph" });

  const [ regular, bold ] = await Promise.all([
    loadFont("Montserrat-Regular.ttf"),
    loadFont("Montserrat-Bold.ttf"),
  ]);

  const chips = [ t("chipOne"), t("chipTwo"), t("chipThree") ];

  return new ImageResponse(
    (
      // satori gives no element the browser's block display, so every container that holds
      // more than one child declares display: flex.
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: COLOR.background,
          fontFamily: "Montserrat",
        }}
      >
        <div style={{ display: "flex", width: "100%", height: 12, backgroundColor: COLOR.primary }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "64px 80px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 60,
                height: 60,
                borderRadius: 16,
                backgroundColor: COLOR.primary,
                color: COLOR.primaryForeground,
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              {MONOGRAM}
            </div>
            <div
              style={{
                display: "flex",
                marginLeft: 22,
                fontSize: 24,
                letterSpacing: 4,
                color: COLOR.mutedForeground,
              }}
            >
              {SITE_DOMAIN.toUpperCase()}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 96,
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: -2,
                color: COLOR.foreground,
              }}
            >
              {SITE.name}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 12,
                fontSize: 44,
                color: COLOR.primary,
              }}
            >
              {t("role", { role: jobTitle(locale), location: SITE.location.countryName })}
            </div>
            <div
              style={{
                display: "flex",
                maxWidth: 960,
                marginTop: 26,
                fontSize: 28,
                lineHeight: 1.35,
                color: COLOR.mutedForeground,
              }}
            >
              {t("tagline")}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              paddingTop: 34,
              borderTop: `1px solid ${COLOR.border}`,
            }}
          >
            {chips.map((chip) => (
              <div
                key={chip}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginRight: 14,
                  padding: "12px 24px",
                  borderRadius: 999,
                  border: `1px solid ${COLOR.border}`,
                  backgroundColor: COLOR.muted,
                  color: COLOR.accentForeground,
                  fontSize: 24,
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        { name: "Montserrat", data: regular, weight: 400, style: "normal" },
        { name: "Montserrat", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}

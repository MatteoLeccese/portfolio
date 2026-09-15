// src/app/[locale]/privacy/opengraph-image.tsx
/**
 * The locale's social card, served at /{locale}/privacy/opengraph-image. It re-exports the
 * card [locale]/opengraph-image.tsx renders, so this route declares no URL, size or alt of
 * its own.
 */
export { alt, contentType, default, generateStaticParams, size } from "../opengraph-image";

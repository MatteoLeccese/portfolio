// src/app/layout.tsx
import type { ReactNode } from "react";

import "./globals.css";

/**
 * Root layout. Returns `children` and renders no document shell: the `<html>` element
 * comes from src/app/[locale]/layout.tsx for the localized tree and from
 * src/app/not-found.tsx for the root 404.
 *
 * The stylesheet import above is here because both of those documents render inside this
 * layout; React hoists the link into whichever `<head>` is emitted downstream. No
 * metadata is declared here.
 */
export default function RootLayout ({ children }: Readonly<{ children: ReactNode; }>) {
  return children;
}

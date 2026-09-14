// src/app/layout.tsx
import type { ReactNode } from "react";

import "./globals.css";

/**
 * Root layout of passage. It returns `children` and renders no document shell (§5.4,
 * §8.4, §11.3.1): the only `<html>` of the localized tree is emitted by
 * src/app/[locale]/layout.tsx, and src/app/not-found.tsx emits its own.
 *
 * WHY IT STILL EXISTS AT ALL, being three lines: Next requires a root layout, and the
 * root 404 renders inside THIS one, not inside the localized layout — which is precisely
 * what §8.6 relies on. That makes this file the single point both branches of the tree
 * pass through, and therefore the right home for the stylesheet import below.
 *
 * `import "./globals.css"` lives here and NOT in the two files that render `<html>`.
 * The spec never says where it goes; putting it in the localized layout alone would
 * leave the root 404 without a single rule of the design system — unstyled black serif
 * on white, with a green build. React hoists the stylesheet link into whichever `<head>`
 * is rendered downstream, so one import covers both documents. Verified with
 * `curl -s http://127.0.0.1:3200/fr | grep stylesheet`.
 *
 * It declares no metadata on purpose (§11.3.1): `metadataBase`, `title.template` and the
 * alternates are declared once, in the localized layout, which is the one that knows the
 * locale.
 *
 * NOTE ON THE FONT: this file no longer renders `<html>`, so `sans.variable` is NOT here
 * any more. It moved, together with the document shell, to src/app/[locale]/layout.tsx
 * and to src/app/not-found.tsx — the two files that do render one. See the CONTRACT block
 * in src/lib/fonts.ts, and the "font wiring" block of src/lib/fonts.test.ts, which now
 * discovers those files instead of trusting this one.
 */
export default function RootLayout ({ children }: Readonly<{ children: ReactNode; }>) {
  return children;
}

// src/i18n/navigation.ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation helpers. Everything inside the app uses these instead of
 * `next/link` and `next/navigation`, so the "/es" prefix is applied by the router and
 * never written by hand.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

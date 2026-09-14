// src/components/theme/ThemeToggle.tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import { runThemeSweep } from "@/lib/motion/theme-sweep";
import { THEME_COLOR_SRGB } from "@/lib/palette-srgb";
import { serializeThemeCookie, type Theme } from "@/lib/theme";

/**
 * Theme switch.
 *
 * Holds no React state: the current theme is read from the `dark` class on the root
 * element at click time, which the pre-paint script sets before hydration. Both icons
 * stay in the DOM and the `dark:` variant decides which one is visible, so the served
 * markup is valid for both themes. The accessible name comes from the sr-only span and
 * describes the action, not a state.
 */
export function ThemeToggle () {
  const t = useTranslations("Theme");

  /**
   * Applies `next` to the DOM, synchronously: runThemeSweep calls it from inside
   * startViewTransition().
   */
  function applyTheme (next: Theme): void {
    const root = document.documentElement;

    // Suppress transitions so the whole palette does not animate across the change.
    root.setAttribute("data-theme-switching", "");
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    document.querySelector(`meta[name="theme-color"]`)
      ?.setAttribute("content", THEME_COLOR_SRGB[ next ]);

    // Removes the flag two frames later, once the new styles have been applied.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        root.removeAttribute("data-theme-switching");
      });
    });
  }

  /** Writes the theme cookie, on the client. */
  function persistTheme (next: Theme): void {
    document.cookie = serializeThemeCookie(next, window.location.protocol === "https:");
  }

  function handleToggle (event: MouseEvent<HTMLButtonElement>): void {
    const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    const rect = event.currentTarget.getBoundingClientRect();

    // runThemeSweep decides whether there is a sweep at all: with reduced motion, without
    // View Transitions support, or under 768px it just calls apply() and persist().
    runThemeSweep({
      origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      apply: () => {
        applyTheme(next);
      },
      persist: () => {
        persistTheme(next);
      },
    });
  }

  return (
    <Button variant="ghost" size="icon" data-testid="theme-toggle" onClick={handleToggle}>
      <Sun aria-hidden="true" className="hidden size-5 dark:block" />
      <Moon aria-hidden="true" className="block size-5 dark:hidden" />
      <span className="sr-only block dark:hidden">{t("toDark")}</span>
      <span className="sr-only hidden dark:block">{t("toLight")}</span>
    </Button>
  );
}

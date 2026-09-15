// src/components/common/CopyButton.tsx
"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** How long the button stays in its copied state. */
const RESET_MS = 2400;

/** Off-viewport offset of the holder the fallback selects from. */
const OFFSCREEN = "-9999px";

/** Copies `text` by selecting it inside a holder the visitor never sees. */
function copyBySelection (text: string): boolean {
  const holder = document.createElement("textarea");

  holder.value = text;
  holder.readOnly = true;
  holder.setAttribute("aria-hidden", "true");
  holder.style.position = "fixed";
  holder.style.top = "0";
  holder.style.left = OFFSCREEN;
  document.body.append(holder);
  holder.select();

  let done = false;
  try {
    done = document.execCommand("copy");
  } catch {
    done = false;
  }

  holder.remove();

  return done;
}

/**
 * Writes `text` to the clipboard through the async API, and through the selection
 * holder wherever that API is missing or refuses.
 */
async function copyToClipboard (text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);

      return true;
    } catch {
      return copyBySelection(text);
    }
  }

  return copyBySelection(text);
}

interface CopyButtonProps {

  /** The text written to the clipboard. */
  readonly value: string;

  /** Accessible name of the button. It does not change when the value is copied. */
  readonly copyLabel: string;

  /** What the live region announces once the value is on the clipboard. */
  readonly copiedLabel: string;
  readonly className?: string;
}

/**
 * Copies one short value to the clipboard.
 *
 * Its accessible name never changes: the result is announced by the live region beside
 * it, and shown by the swap from the copy glyph to the check glyph, which `data-copied`
 * on the button drives from CSS. A copy that fails announces nothing and leaves the
 * value on screen to be selected by hand.
 *
 * Both labels arrive translated: this island reads no message catalogue.
 */
export function CopyButton ({ value, copyLabel, copiedLabel, className }: CopyButtonProps) {
  const [ copied, setCopied ] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  async function handleCopy (): Promise<void> {
    const done = await copyToClipboard(value);
    if (!done) return;

    setCopied(true);

    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopied(false);
    }, RESET_MS);
  }

  return (
    <span className="inline-flex items-center">
      <Button
        aria-label={copyLabel}
        className={cn("touch-target", className)}
        data-copied={copied ? "true" : "false"}
        data-testid="copy-button"
        onClick={() => {
          void handleCopy();
        }}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <span className="copy-icons">
          <Copy aria-hidden="true" className="copy-icon-idle size-4" />
          <Check aria-hidden="true" className="copy-icon-done size-4" />
        </span>
      </Button>

      <output aria-live="polite" className="sr-only">{copied ? copiedLabel : ""}</output>
    </span>
  );
}

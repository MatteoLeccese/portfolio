// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Composes conditional class values and resolves conflicting Tailwind classes. */
export function cn (...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

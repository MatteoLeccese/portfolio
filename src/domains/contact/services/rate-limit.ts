// src/domains/contact/services/rate-limit.ts
import "server-only";

import { createHash } from "node:crypto";

import type { ContactActionErrorCode } from "@/domains/contact/types";

/**
 * Limiter settings: the length of one window, how many requests it admits, how many live
 * buckets the map holds, and the length of a bucket key.
 */
export const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 60 * 1000,
  maxPerWindow: 3,
  maxBuckets: 512,
  keyLength: 32,
} as const;

const TOO_MANY_REQUESTS: Extract<ContactActionErrorCode, "too_many_requests"> = "too_many_requests";

/** The limiter's answer for one identifier. `code` is a `Contact.errors` key. */
export type RateLimitVerdict =
  | { ok: true; code: null; retryAfterSeconds: 0; }
  | { ok: false; code: typeof TOO_MANY_REQUESTS; retryAfterSeconds: number; };

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * SHA-256 of `salt:identifier`, hex, truncated to `keyLength`. Throws when
 * RATE_LIMIT_SALT is absent.
 */
export function bucketKey (identifier: string): string {
  const salt = process.env.RATE_LIMIT_SALT;
  if (!salt) throw new Error("Missing environment variable: RATE_LIMIT_SALT");
  return createHash("sha256")
    .update(`${salt}:${identifier}`)
    .digest("hex")
    .slice(0, RATE_LIMIT_CONFIG.keyLength);
}

function allowed (): RateLimitVerdict {
  return { ok: true, code: null, retryAfterSeconds: 0 };
}

/**
 * Drops buckets whose window has closed once the map reaches `maxBuckets`, then evicts
 * the oldest entries until there is room for one more.
 */
function sweep (now: number): void {
  if (buckets.size < RATE_LIMIT_CONFIG.maxBuckets) return;
  for (const [ key, bucket ] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size >= RATE_LIMIT_CONFIG.maxBuckets) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) return;
    buckets.delete(oldest);
  }
}

/**
 * Reads the bucket for `identifier` at `now` without mutating it. Returns
 * `too_many_requests` with the seconds left in the window once the cap is reached.
 */
export function checkRateLimit (identifier: string, now: number = Date.now()): RateLimitVerdict {
  const current = buckets.get(bucketKey(identifier));

  if (!current || current.resetAt <= now) return allowed();
  if (current.count >= RATE_LIMIT_CONFIG.maxPerWindow) {
    return {
      ok: false,
      code: TOO_MANY_REQUESTS,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }
  return allowed();
}

/**
 * Counts one request against `identifier` at `now`, opening a window when none is
 * running and reusing the one in flight otherwise.
 */
export function consumeRateLimit (identifier: string, now: number = Date.now()): void {
  sweep(now);
  const key = bucketKey(identifier);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_CONFIG.windowMs });
    return;
  }
  current.count += 1;
}

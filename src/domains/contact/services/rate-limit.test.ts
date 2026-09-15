// src/domains/contact/services/rate-limit.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const SALT = "test-salt";
const NOW = 1_757_000_000_000;

/**
 * Loads a limiter whose bucket map is empty: the map lives in module scope, so every test
 * needs its own instance.
 */
async function loadLimiter () {
  vi.resetModules();
  const limiter = await import("@/domains/contact/services/rate-limit");
  return { ...limiter, ...limiter.RATE_LIMIT_CONFIG };
}

describe("rate limit", () => {
  beforeEach(() => {
    process.env.RATE_LIMIT_SALT = SALT;
  });

  afterEach(() => {
    delete process.env.RATE_LIMIT_SALT;
  });

  it("allows the last request of the window and rejects the one after it", async () => {
    const { checkRateLimit, consumeRateLimit, maxPerWindow } = await loadLimiter();

    for (let index = 0; index < maxPerWindow - 1; index += 1) {
      consumeRateLimit("1.2.3.4", NOW + index);
    }

    const last = checkRateLimit("1.2.3.4", NOW + maxPerWindow);
    expect(last.ok).toBe(true);
    expect(last.code).toBeNull();

    consumeRateLimit("1.2.3.4", NOW + maxPerWindow);

    const rejected = checkRateLimit("1.2.3.4", NOW + maxPerWindow + 1);
    expect(rejected.ok).toBe(false);
    expect(rejected.code).toBe("too_many_requests");
  });

  it("reports the whole seconds left until the window resets", async () => {
    const { checkRateLimit, consumeRateLimit, maxPerWindow, windowMs } = await loadLimiter();

    for (let index = 0; index < maxPerWindow; index += 1) consumeRateLimit("1.2.3.4", NOW);

    expect(checkRateLimit("1.2.3.4", NOW).retryAfterSeconds).toBe(windowMs / 1000);
    expect(checkRateLimit("1.2.3.4", NOW + windowMs - 1000).retryAfterSeconds).toBe(1);
    expect(checkRateLimit("1.2.3.4", NOW + windowMs - 1).retryAfterSeconds).toBe(1);
  });

  it("rejects on the last millisecond of the window and admits the first of the next", async () => {
    const { checkRateLimit, consumeRateLimit, maxPerWindow, windowMs } = await loadLimiter();

    for (let index = 0; index < maxPerWindow; index += 1) consumeRateLimit("1.2.3.4", NOW);

    expect(checkRateLimit("1.2.3.4", NOW + windowMs - 1).ok).toBe(false);
    expect(checkRateLimit("1.2.3.4", NOW + windowMs).ok).toBe(true);
  });

  it("starts the next window with a full allowance", async () => {
    const { checkRateLimit, consumeRateLimit, maxPerWindow, windowMs } = await loadLimiter();

    for (let index = 0; index < maxPerWindow; index += 1) consumeRateLimit("1.2.3.4", NOW);

    const next = NOW + windowMs;
    for (let index = 0; index < maxPerWindow; index += 1) {
      expect(checkRateLimit("1.2.3.4", next + index).ok).toBe(true);
      consumeRateLimit("1.2.3.4", next + index);
    }
    expect(checkRateLimit("1.2.3.4", next + maxPerWindow).ok).toBe(false);
  });

  it("keeps one bucket per identifier", async () => {
    const { checkRateLimit, consumeRateLimit, maxPerWindow } = await loadLimiter();

    for (let index = 0; index < maxPerWindow; index += 1) consumeRateLimit("1.2.3.4", NOW);

    expect(checkRateLimit("1.2.3.4", NOW).ok).toBe(false);
    expect(checkRateLimit("5.6.7.8", NOW).ok).toBe(true);
    expect(checkRateLimit("unknown", NOW).ok).toBe(true);
  });

  it("sends every caller without a trusted address to one shared bucket", async () => {
    const { checkRateLimit, consumeRateLimit, maxPerWindow } = await loadLimiter();

    for (let index = 0; index < maxPerWindow; index += 1) consumeRateLimit("unknown", NOW);

    expect(checkRateLimit("unknown", NOW).ok).toBe(false);
  });

  it("leaves the allowance untouched when only checking", async () => {
    const { checkRateLimit, consumeRateLimit, maxPerWindow } = await loadLimiter();

    consumeRateLimit("1.2.3.4", NOW);
    for (let index = 0; index < 20; index += 1) checkRateLimit("1.2.3.4", NOW);

    for (let index = 1; index < maxPerWindow; index += 1) {
      expect(checkRateLimit("1.2.3.4", NOW).ok).toBe(true);
      consumeRateLimit("1.2.3.4", NOW);
    }
    expect(checkRateLimit("1.2.3.4", NOW).ok).toBe(false);
  });

  it("keys buckets by a salted hash instead of the address", async () => {
    const { bucketKey, keyLength } = await loadLimiter();
    const key = bucketKey("203.0.113.7");

    expect(key).toMatch(/^[0-9a-f]+$/);
    expect(key).toHaveLength(keyLength);
    expect(key).not.toContain("203.0.113.7");
    expect(key).not.toBe(bucketKey("203.0.113.8"));
  });

  it("produces a different key for the same address under a different salt", async () => {
    const { bucketKey } = await loadLimiter();
    const first = bucketKey("203.0.113.7");

    process.env.RATE_LIMIT_SALT = "another-salt";
    expect(bucketKey("203.0.113.7")).not.toBe(first);
  });

  it("throws when the salt is missing", async () => {
    const { checkRateLimit, consumeRateLimit } = await loadLimiter();
    delete process.env.RATE_LIMIT_SALT;

    expect(() => checkRateLimit("1.2.3.4", NOW)).toThrow(/RATE_LIMIT_SALT/);
    expect(() => consumeRateLimit("1.2.3.4", NOW)).toThrow(/RATE_LIMIT_SALT/);
  });
});

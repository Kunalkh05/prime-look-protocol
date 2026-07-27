import { describe, expect, it } from "vitest";
import { RateLimiter } from "./rateLimit.ts";

describe("RateLimiter", () => {
  it("allows a full burst then blocks", () => {
    const limiter = new RateLimiter({ capacity: 3, refillSeconds: 60 });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("keeps separate buckets per key", () => {
    const limiter = new RateLimiter({ capacity: 1, refillSeconds: 60 });
    expect(limiter.check("alice").allowed).toBe(true);
    expect(limiter.check("alice").allowed).toBe(false);
    // One person exhausting their budget must not lock anyone else out.
    expect(limiter.check("bob").allowed).toBe(true);
  });

  it("refills over time", () => {
    const limiter = new RateLimiter({ capacity: 2, refillSeconds: 10 });
    const t0 = 1_000_000;
    limiter.check("a", t0);
    limiter.check("a", t0);
    expect(limiter.check("a", t0).allowed).toBe(false);

    // Five seconds refills one of two tokens.
    expect(limiter.check("a", t0 + 5_000).allowed).toBe(true);
  });

  it("never exceeds capacity no matter how long it idles", () => {
    const limiter = new RateLimiter({ capacity: 2, refillSeconds: 10 });
    const t0 = 1_000_000;
    limiter.check("a", t0);

    const farFuture = t0 + 10_000_000;
    expect(limiter.check("a", farFuture).allowed).toBe(true);
    expect(limiter.check("a", farFuture).allowed).toBe(true);
    expect(limiter.check("a", farFuture).allowed).toBe(false);
  });

  it("reports a retry delay when blocked", () => {
    const limiter = new RateLimiter({ capacity: 1, refillSeconds: 60 });
    limiter.check("a");
    const blocked = limiter.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(60);
  });

  it("prunes only fully-refilled buckets", () => {
    const limiter = new RateLimiter({ capacity: 2, refillSeconds: 10 });
    const t0 = 1_000_000;
    limiter.check("stale", t0);
    limiter.check("fresh", t0);
    limiter.check("fresh", t0);

    // Long enough for "stale" to refill fully, so it can be dropped; "fresh"
    // is dropped too once it has also refilled. Pruning must never resurrect a
    // spent bucket as blocked.
    limiter.prune(t0 + 60_000);
    expect(limiter.check("fresh", t0 + 60_000).allowed).toBe(true);
  });
});

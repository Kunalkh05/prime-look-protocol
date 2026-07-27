/**
 * In-memory token-bucket rate limiting.
 *
 * Two things need limiting, for different reasons:
 *
 *   - **Sign-in attempts**, so a leaked URL doesn't let someone grind through
 *     the invite-code space. This is the one that protects the door.
 *   - **Analysis calls**, so a single session can't drain the upstream API
 *     quota — whether through enthusiasm or malice.
 *
 * In-memory is the right call at this scale: buckets reset on restart, which
 * for a handful of users is a non-issue, and it avoids running Redis for a tool
 * with a dozen people on it. If this ever grows past one server instance, this
 * is the piece that needs replacing.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export interface LimiterOptions {
  /** Bucket size — the most requests allowed in a burst. */
  capacity: number;
  /** Seconds to refill the bucket from empty to full. */
  refillSeconds: number;
}

export interface LimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the next token is available. */
  retryAfter: number;
}

export class RateLimiter {
  #buckets = new Map<string, Bucket>();
  #capacity: number;
  #refillRate: number; // tokens per second

  constructor({ capacity, refillSeconds }: LimiterOptions) {
    this.#capacity = capacity;
    this.#refillRate = capacity / refillSeconds;
  }

  check(key: string, now = Date.now()): LimitResult {
    const bucket = this.#buckets.get(key) ?? { tokens: this.#capacity, lastRefill: now };

    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.#capacity, bucket.tokens + elapsed * this.#refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      this.#buckets.set(key, bucket);
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((1 - bucket.tokens) / this.#refillRate),
      };
    }

    bucket.tokens -= 1;
    this.#buckets.set(key, bucket);
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfter: 0 };
  }

  /** Drop buckets that have fully refilled, so the map can't grow without bound. */
  prune(now = Date.now()): void {
    for (const [key, bucket] of this.#buckets) {
      const elapsed = (now - bucket.lastRefill) / 1000;
      if (bucket.tokens + elapsed * this.#refillRate >= this.#capacity) {
        this.#buckets.delete(key);
      }
    }
  }

  /** Testing hook. */
  reset(): void {
    this.#buckets.clear();
  }
}

/** Ten sign-in attempts per fifteen minutes, per IP. */
export const authLimiter = new RateLimiter({ capacity: 10, refillSeconds: 15 * 60 });

/** Thirty analyses per hour, per session. */
export const analyzeLimiter = new RateLimiter({ capacity: 30, refillSeconds: 60 * 60 });

/** A wider ceiling per IP, to catch someone cycling through sessions. */
export const ipLimiter = new RateLimiter({ capacity: 60, refillSeconds: 60 * 60 });

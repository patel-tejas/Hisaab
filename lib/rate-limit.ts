/**
 * Fixed-window, in-memory rate limiter keyed by user and route.
 *
 * It is per server instance: on a multi-instance or serverless deployment a
 * determined caller can get up to N × the limit. That is still enough to stop
 * a runaway client or a casual script from burning the Groq quota or tying up
 * the Eve bridge. Swap the store for Redis/Upstash when that matters.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
        if (buckets.size >= MAX_KEYS) {
            for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
            if (buckets.size >= MAX_KEYS) buckets.clear();
        }
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true };
    }

    if (bucket.count >= limit) {
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
    }

    bucket.count++;
    return { ok: true };
}

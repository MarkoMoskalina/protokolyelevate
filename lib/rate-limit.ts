import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _verifyRateLimit: Ratelimit | null = null;

function getVerifyRateLimit(): Ratelimit | null {
  if (_verifyRateLimit) return _verifyRateLimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });

  _verifyRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "protocol:rl:verify",
  });

  return _verifyRateLimit;
}

/**
 * /api/public/verify — 5 requests per 15 minutes per IP.
 *
 * The 6-digit access code has 1M combinations; without rate limiting an
 * attacker with a known token could brute-force it in minutes.
 *
 * Returns null if Upstash env vars are not configured (e.g. during build
 * or local dev without Redis). Callers should treat null as "allow".
 */
export { getVerifyRateLimit };

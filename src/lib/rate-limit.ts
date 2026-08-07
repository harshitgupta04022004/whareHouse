import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RateLimitError } from "./errors";

// ─── Rate Limiter (Prompt 09) ─────────────────────────────────────────
//
// Uses Upstash Redis for distributed rate limiting.
// Falls back to in-memory if Redis is not configured.

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("Upstash Redis not configured — rate limiting disabled");
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

// ─── Rate Limit Configurations ────────────────────────────────────────

interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "auth:login": { windowSeconds: 900, maxRequests: 15 },          // 15 per 15 min
  "auth:password_reset": { windowSeconds: 3600, maxRequests: 5 }, // 5 per hour
  "do:create": { windowSeconds: 60, maxRequests: 50 },            // 50 per min
  "do:update": { windowSeconds: 60, maxRequests: 50 },            // 50 per min
  "do:delete": { windowSeconds: 60, maxRequests: 20 },            // 20 per min
  "dashboard": { windowSeconds: 60, maxRequests: 100 },           // 100 per min
  "files:upload": { windowSeconds: 60, maxRequests: 10 },         // 10 per min
  "api:general": { windowSeconds: 60, maxRequests: 100 },         // 100 per min
};

// ─── In-Memory Fallback ───────────────────────────────────────────────

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function checkMemoryRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowSeconds * 1000;
    memoryStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

// ─── Public API ───────────────────────────────────────────────────────

export type RateLimitKey =
  | "auth:login"
  | "auth:password_reset"
  | "do:create"
  | "do:update"
  | "do:delete"
  | "dashboard"
  | "files:upload"
  | "api:general";

/**
 * Check rate limit for a given key and identifier.
 * Throws RateLimitError if limit exceeded.
 *
 * @param key - The rate limit category (e.g., "do:create")
 * @param identifier - Unique identifier (user ID, IP, etc.)
 * @returns Rate limit info
 */
export async function checkRateLimit(
  key: RateLimitKey,
  identifier: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = RATE_LIMITS[key];
  if (!config) return { allowed: true, remaining: 999, resetAt: Date.now() };

  const redisClient = getRedis();

  if (!redisClient) {
    // In-memory fallback for development
    return checkMemoryRateLimit(`${key}:${identifier}`, config);
  }

  const ratelimit = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowSeconds}s`),
    analytics: true,
  });

  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    throw new RateLimitError(retryAfter);
  }

  return {
    allowed: success,
    remaining,
    resetAt: reset,
  };
}

/**
 * Get rate limit info without throwing (for response headers).
 */
export async function getRateLimitInfo(
  key: RateLimitKey,
  identifier: string,
): Promise<{ remaining: number; resetAt: number } | null> {
  const config = RATE_LIMITS[key];
  if (!config) return null;

  const redisClient = getRedis();
  if (!redisClient) return null;

  const ratelimit = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowSeconds}s`),
    analytics: true,
  });

  const { remaining, reset } = await ratelimit.limit(identifier);

  return { remaining, resetAt: reset };
}

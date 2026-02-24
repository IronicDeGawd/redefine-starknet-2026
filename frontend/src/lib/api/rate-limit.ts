/**
 * Rate Limiting using Redis
 * Sliding window rate limiter for API requests
 */

import { getRedisClient } from "@/lib/redis/client";
import type { ApiKeyInfo } from "./auth";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp
  limit: number;
}

const MINUTE_WINDOW = 60; // 60 seconds
const DAY_WINDOW = 86400; // 24 hours

/**
 * Check rate limit for a given API key
 * Uses sliding window counter in Redis
 */
export async function checkRateLimit(
  apiKeyId: string,
  keyInfo: ApiKeyInfo
): Promise<RateLimitResult> {
  try {
    const redis = getRedisClient();
    const now = Math.floor(Date.now() / 1000);
    const minuteKey = `ratelimit:${apiKeyId}:minute:${Math.floor(now / MINUTE_WINDOW)}`;
    const dayKey = `ratelimit:${apiKeyId}:day:${Math.floor(now / DAY_WINDOW)}`;

    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();
    pipeline.incr(minuteKey);
    pipeline.expire(minuteKey, MINUTE_WINDOW);
    pipeline.incr(dayKey);
    pipeline.expire(dayKey, DAY_WINDOW);
    pipeline.get(minuteKey);
    pipeline.get(dayKey);

    const results = await pipeline.exec();

    if (!results) {
      // Redis unavailable, allow request (fail open)
      return {
        allowed: true,
        remaining: keyInfo.rateLimit.requestsPerMinute,
        resetAt: now + MINUTE_WINDOW,
        limit: keyInfo.rateLimit.requestsPerMinute,
      };
    }

    const minuteCount = parseInt(String(results[4]?.[1]) || "0", 10);
    const dayCount = parseInt(String(results[5]?.[1]) || "0", 10);

    // Check minute limit
    if (minuteCount > keyInfo.rateLimit.requestsPerMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: (Math.floor(now / MINUTE_WINDOW) + 1) * MINUTE_WINDOW,
        limit: keyInfo.rateLimit.requestsPerMinute,
      };
    }

    // Check daily limit
    if (dayCount > keyInfo.rateLimit.requestsPerDay) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: (Math.floor(now / DAY_WINDOW) + 1) * DAY_WINDOW,
        limit: keyInfo.rateLimit.requestsPerDay,
      };
    }

    return {
      allowed: true,
      remaining: keyInfo.rateLimit.requestsPerMinute - minuteCount,
      resetAt: (Math.floor(now / MINUTE_WINDOW) + 1) * MINUTE_WINDOW,
      limit: keyInfo.rateLimit.requestsPerMinute,
    };
  } catch (error) {
    console.warn("[Rate Limit] Redis error, allowing request:", error);
    // Fail open - allow request if Redis is unavailable
    return {
      allowed: true,
      remaining: keyInfo.rateLimit.requestsPerMinute,
      resetAt: Math.floor(Date.now() / 1000) + MINUTE_WINDOW,
      limit: keyInfo.rateLimit.requestsPerMinute,
    };
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(result.resetAt),
  };
}

/**
 * Simple in-memory rate limiter (fallback when Redis unavailable)
 */
const inMemoryLimits = new Map<string, { count: number; resetAt: number }>();

export function checkInMemoryRateLimit(
  apiKeyId: string,
  limit: number
): RateLimitResult {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / MINUTE_WINDOW) * MINUTE_WINDOW;
  const key = `${apiKeyId}:${windowStart}`;

  const existing = inMemoryLimits.get(key);

  if (!existing || existing.resetAt < now) {
    // New window
    inMemoryLimits.set(key, { count: 1, resetAt: windowStart + MINUTE_WINDOW });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: windowStart + MINUTE_WINDOW,
      limit,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      limit,
    };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
    limit,
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [key, value] of inMemoryLimits.entries()) {
    if (value.resetAt < now) {
      inMemoryLimits.delete(key);
    }
  }
}, 60000); // Every minute

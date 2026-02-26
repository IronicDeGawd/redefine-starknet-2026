/**
 * API Key Authentication
 * Supports hardcoded keys + Redis-stored dynamic keys
 */

import { NextRequest } from "next/server";
import { getRedisClient } from "@/lib/redis/client";

export interface ApiKeyInfo {
  id: string;
  name: string;
  tier: "free" | "pro" | "enterprise";
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  createdAt: number;
}

// Rate limit presets by tier
export const RATE_LIMITS = {
  free: { requestsPerMinute: 60, requestsPerDay: 1000 },
  pro: { requestsPerMinute: 600, requestsPerDay: 50000 },
  enterprise: { requestsPerMinute: 1000, requestsPerDay: 100000 },
} as const;

// Hardcoded keys (always available, no Redis needed)
const STATIC_API_KEYS: Record<string, ApiKeyInfo> = {
  zkcred_test_demo123: {
    id: "demo",
    name: "Demo Key",
    tier: "free",
    rateLimit: RATE_LIMITS.free,
    createdAt: Date.now(),
  },
  zkcred_test_hackathon: {
    id: "hackathon",
    name: "Hackathon Key",
    tier: "pro",
    rateLimit: RATE_LIMITS.pro,
    createdAt: Date.now(),
  },
  ...(process.env.ZKCRED_API_KEY
    ? {
        [process.env.ZKCRED_API_KEY]: {
          id: "env",
          name: "Environment Key",
          tier: "enterprise" as const,
          rateLimit: RATE_LIMITS.enterprise,
          createdAt: Date.now(),
        },
      }
    : {}),
};

const REDIS_KEY_PREFIX = "apikey:";

/**
 * Generate a random API key
 */
export function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "zkcred_test_";
  for (let i = 0; i < 24; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

/**
 * Store an API key in Redis
 */
export async function storeApiKey(
  apiKey: string,
  info: ApiKeyInfo
): Promise<void> {
  const redis = getRedisClient();
  await redis.set(
    `${REDIS_KEY_PREFIX}${apiKey}`,
    JSON.stringify(info),
    "EX",
    60 * 60 * 24 * 90 // 90 day TTL
  );
}

/**
 * Look up an API key from Redis
 */
async function getRedisApiKey(apiKey: string): Promise<ApiKeyInfo | null> {
  try {
    const redis = getRedisClient();
    const data = await redis.get(`${REDIS_KEY_PREFIX}${apiKey}`);
    if (!data) return null;
    return JSON.parse(data) as ApiKeyInfo;
  } catch {
    return null;
  }
}

/**
 * Delete an API key from Redis
 */
export async function deleteApiKey(apiKey: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const removed = await redis.del(`${REDIS_KEY_PREFIX}${apiKey}`);
    return removed > 0;
  } catch {
    return false;
  }
}

/**
 * Extract API key from request headers
 */
export function extractApiKey(req: NextRequest): string | null {
  const headerKey = req.headers.get("X-API-Key");
  if (headerKey) return headerKey;

  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const { searchParams } = new URL(req.url);
  const queryKey = searchParams.get("api_key");
  if (queryKey) return queryKey;

  return null;
}

/**
 * Validate API key — checks static keys first, then Redis
 */
export async function validateApiKey(
  apiKey: string
): Promise<ApiKeyInfo | null> {
  // Check static keys first (fast, no I/O)
  if (apiKey in STATIC_API_KEYS) {
    return STATIC_API_KEYS[apiKey];
  }

  // Check Redis for dynamic keys
  return getRedisApiKey(apiKey);
}

/**
 * Get API key info from request
 */
export async function getApiKeyInfo(
  req: NextRequest
): Promise<ApiKeyInfo | null> {
  const apiKey = extractApiKey(req);
  if (!apiKey) return null;
  return validateApiKey(apiKey);
}

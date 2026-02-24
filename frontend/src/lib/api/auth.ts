/**
 * API Key Authentication
 * Simple API key validation for hackathon MVP
 * In production, use a proper key management system
 */

import { NextRequest } from "next/server";

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

// Hardcoded API keys for hackathon demo
// In production, these would be stored in a database
const API_KEYS: Record<string, ApiKeyInfo> = {
  // Test keys (prefix: zkcred_test_)
  zkcred_test_demo123: {
    id: "demo",
    name: "Demo Key",
    tier: "free",
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 1000,
    },
    createdAt: Date.now(),
  },
  zkcred_test_hackathon: {
    id: "hackathon",
    name: "Hackathon Key",
    tier: "pro",
    rateLimit: {
      requestsPerMinute: 600,
      requestsPerDay: 50000,
    },
    createdAt: Date.now(),
  },

  // Allow configurable key from env
  ...(process.env.ZKCRED_API_KEY
    ? {
        [process.env.ZKCRED_API_KEY]: {
          id: "env",
          name: "Environment Key",
          tier: "enterprise" as const,
          rateLimit: {
            requestsPerMinute: 1000,
            requestsPerDay: 100000,
          },
          createdAt: Date.now(),
        },
      }
    : {}),
};

/**
 * Extract API key from request headers
 */
export function extractApiKey(req: NextRequest): string | null {
  // Check X-API-Key header first
  const headerKey = req.headers.get("X-API-Key");
  if (headerKey) return headerKey;

  // Check Authorization header (Bearer token)
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Check query param (for testing)
  const { searchParams } = new URL(req.url);
  const queryKey = searchParams.get("api_key");
  if (queryKey) return queryKey;

  return null;
}

/**
 * Validate API key and return key info
 */
export function validateApiKey(apiKey: string): ApiKeyInfo | null {
  return API_KEYS[apiKey] || null;
}

/**
 * Check if API key is valid
 */
export function isValidApiKey(apiKey: string): boolean {
  return apiKey in API_KEYS;
}

/**
 * Get API key info from request
 */
export function getApiKeyInfo(req: NextRequest): ApiKeyInfo | null {
  const apiKey = extractApiKey(req);
  if (!apiKey) return null;
  return validateApiKey(apiKey);
}

/**
 * Check if request is authenticated
 */
export function isAuthenticated(req: NextRequest): boolean {
  const apiKey = extractApiKey(req);
  return apiKey !== null && isValidApiKey(apiKey);
}

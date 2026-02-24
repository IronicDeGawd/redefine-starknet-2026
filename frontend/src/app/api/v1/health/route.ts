/**
 * GET /api/v1/health - API health check
 * No authentication required
 */

import { NextResponse } from "next/server";
import { isRegistryConfigured } from "@/lib/starknet";

export const runtime = "nodejs";

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  services: {
    api: boolean;
    starknet: boolean;
    redis: boolean;
  };
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const timestamp = new Date().toISOString();

  // Check Starknet configuration
  const starknetHealthy = isRegistryConfigured();

  // Check Redis (best effort)
  let redisHealthy = false;
  try {
    const { getRedisClient } = await import("@/lib/redis/client");
    const redis = getRedisClient();
    await redis.ping();
    redisHealthy = true;
  } catch {
    // Redis unavailable
  }

  const services = {
    api: true,
    starknet: starknetHealthy,
    redis: redisHealthy,
  };

  // Determine overall status
  let status: HealthResponse["status"] = "healthy";
  if (!starknetHealthy) {
    status = "unhealthy";
  } else if (!redisHealthy) {
    status = "degraded";
  }

  return NextResponse.json({
    status,
    timestamp,
    version: "1.0.0",
    services,
  });
}

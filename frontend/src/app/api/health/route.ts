/**
 * /api/health - Health check endpoint
 * Returns service status and configuration state
 */

import { NextResponse } from "next/server";
import { isBedrockConfigured } from "@/lib/bedrock";
import { isServerAccountConfigured, isRegistryConfigured } from "@/lib/starknet";

export const runtime = "nodejs";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    bedrock: boolean;
    starknet: boolean;
    registry: boolean;
  };
  network: string;
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const bedrockOk = isBedrockConfigured();
  const starknetOk = isServerAccountConfigured();
  const registryOk = isRegistryConfigured();

  const allOk = bedrockOk && starknetOk && registryOk;
  const noneOk = !bedrockOk && !starknetOk && !registryOk;

  const status = allOk ? "healthy" : noneOk ? "unhealthy" : "degraded";

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      bedrock: bedrockOk,
      starknet: starknetOk,
      registry: registryOk,
    },
    network: process.env.NEXT_PUBLIC_STARKNET_NETWORK || "sepolia",
  });
}

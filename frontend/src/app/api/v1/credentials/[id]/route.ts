/**
 * GET /api/v1/credentials/{id} - Get credential details
 * Requires API key authentication
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getCredentialRegistryReader,
  isRegistryConfigured,
} from "@/lib/starknet";
import {
  validateCredentialId,
  feltToString,
  getErrorMessage,
} from "@/lib/utils";
import {
  extractApiKey,
  validateApiKey,
  checkRateLimit,
  getRateLimitHeaders,
  createErrorResponse,
} from "@/lib/api";
import { TIER_NAMES } from "@/types/credential";

export const runtime = "nodejs";

interface CredentialResponse {
  id: string;
  type: string;
  tier: number;
  tierName: string;
  issuedAt: string;
  revoked: boolean;
  status: "active" | "revoked";
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // 1. Extract and validate API key
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    const { body, status } = createErrorResponse("UNAUTHORIZED");
    return NextResponse.json(body, { status });
  }

  const keyInfo = validateApiKey(apiKey);
  if (!keyInfo) {
    const { body, status } = createErrorResponse("UNAUTHORIZED");
    return NextResponse.json(body, { status });
  }

  // 2. Check rate limit
  const rateLimitResult = await checkRateLimit(keyInfo.id, keyInfo);
  const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    const { body, status } = createErrorResponse("RATE_LIMITED");
    return NextResponse.json(body, {
      status,
      headers: rateLimitHeaders,
    });
  }

  // 3. Check Starknet configuration
  if (!isRegistryConfigured()) {
    const { body, status } = createErrorResponse("SERVICE_UNAVAILABLE");
    return NextResponse.json(body, {
      status,
      headers: rateLimitHeaders,
    });
  }

  // 4. Get and validate credential ID
  const { id: credentialId } = await context.params;

  if (!credentialId || !validateCredentialId(credentialId)) {
    const { body, status } = createErrorResponse("INVALID_CREDENTIAL_ID");
    return NextResponse.json(body, {
      status,
      headers: rateLimitHeaders,
    });
  }

  try {
    // 5. Get contract instance
    const registry = getCredentialRegistryReader();

    // 6. Call contract to get credential
    const result = await registry.get_credential(credentialId);

    // 7. Check if credential exists
    const pubkeyHash = BigInt(result.pubkey_hash?.toString() || "0");
    if (pubkeyHash === 0n) {
      const { body, status } = createErrorResponse("NOT_FOUND");
      return NextResponse.json(body, {
        status,
        headers: rateLimitHeaders,
      });
    }

    // 8. Parse credential data
    const tier = Number(result.tier);
    const issuedAt = Number(result.issued_at);
    const revoked = Boolean(result.revoked);
    const credentialType = feltToString(result.credential_type);

    const credential: CredentialResponse = {
      id: credentialId,
      type: credentialType,
      tier,
      tierName: TIER_NAMES[tier as keyof typeof TIER_NAMES] || "Unknown",
      issuedAt: new Date(issuedAt * 1000).toISOString(),
      revoked,
      status: revoked ? "revoked" : "active",
    };

    return NextResponse.json(credential, {
      headers: rateLimitHeaders,
    });
  } catch (error) {
    console.error("[/api/v1/credentials] Error:", error);

    const errorMessage = getErrorMessage(error);

    if (
      errorMessage.includes("Contract not found") ||
      errorMessage.includes("not deployed")
    ) {
      const { body, status } = createErrorResponse("SERVICE_UNAVAILABLE");
      return NextResponse.json(body, {
        status,
        headers: rateLimitHeaders,
      });
    }

    const { body, status } = createErrorResponse("BLOCKCHAIN_ERROR");
    return NextResponse.json(body, {
      status,
      headers: rateLimitHeaders,
    });
  }
}

/**
 * POST /api/v1/credentials/{id}/verify - Verify a credential
 * Optionally checks if credential meets minimum tier requirement
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

interface VerifyRequest {
  minTier?: number;
}

interface VerifyResponse {
  valid: boolean;
  credential?: {
    id: string;
    type: string;
    tier: number;
    tierName: string;
    issuedAt: string;
    status: "active" | "revoked";
  };
  meetsTier?: boolean;
  reason?: "not_found" | "revoked" | "below_tier";
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // 1. Extract and validate API key
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    const { body, status } = createErrorResponse("UNAUTHORIZED");
    return NextResponse.json(body, { status });
  }

  const keyInfo = await validateApiKey(apiKey);
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

  // 4. Parse request body
  let requestBody: VerifyRequest = {};
  try {
    const text = await req.text();
    if (text) {
      requestBody = JSON.parse(text);
    }
  } catch {
    // Empty body is fine
  }

  const minTier = requestBody.minTier;

  // 5. Get and validate credential ID
  const { id: credentialId } = await context.params;

  if (!credentialId || !validateCredentialId(credentialId)) {
    const { body, status } = createErrorResponse("INVALID_CREDENTIAL_ID");
    return NextResponse.json(body, {
      status,
      headers: rateLimitHeaders,
    });
  }

  try {
    // 6. Get contract instance
    const registry = getCredentialRegistryReader();

    // 7. Call contract to get credential
    const result = await registry.get_credential(credentialId);

    // 8. Check if credential exists
    const pubkeyHash = BigInt(result.pubkey_hash?.toString() || "0");
    if (pubkeyHash === 0n) {
      const response: VerifyResponse = {
        valid: false,
        reason: "not_found",
      };
      return NextResponse.json(response, {
        headers: rateLimitHeaders,
      });
    }

    // 9. Parse credential data
    const tier = Number(result.tier);
    const issuedAt = Number(result.issued_at);
    const revoked = Boolean(result.revoked);
    const credentialType = feltToString(result.credential_type);

    // 10. Check if revoked
    if (revoked) {
      const response: VerifyResponse = {
        valid: false,
        reason: "revoked",
        credential: {
          id: credentialId,
          type: credentialType,
          tier,
          tierName: TIER_NAMES[tier as keyof typeof TIER_NAMES] || "Unknown",
          issuedAt: new Date(issuedAt * 1000).toISOString(),
          status: "revoked",
        },
      };
      return NextResponse.json(response, {
        headers: rateLimitHeaders,
      });
    }

    // 11. Check minimum tier if specified
    const meetsTier = minTier === undefined || tier >= minTier;

    const response: VerifyResponse = {
      valid: meetsTier,
      credential: {
        id: credentialId,
        type: credentialType,
        tier,
        tierName: TIER_NAMES[tier as keyof typeof TIER_NAMES] || "Unknown",
        issuedAt: new Date(issuedAt * 1000).toISOString(),
        status: "active",
      },
      meetsTier,
      ...(minTier !== undefined && !meetsTier ? { reason: "below_tier" } : {}),
    };

    return NextResponse.json(response, {
      headers: rateLimitHeaders,
    });
  } catch (error) {
    console.error("[/api/v1/credentials/verify] Error:", error);

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

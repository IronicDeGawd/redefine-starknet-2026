/**
 * POST /api/v1/credentials/batch-verify - Verify multiple credentials
 * Verify up to 100 credentials in a single request
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
export const maxDuration = 60; // 60 seconds for batch operations

const MAX_BATCH_SIZE = 100;

interface BatchVerifyRequest {
  credentialIds: string[];
  minTier?: number;
}

interface CredentialResult {
  id: string;
  valid: boolean;
  tier?: number;
  tierName?: string;
  reason?: "not_found" | "revoked" | "below_tier" | "invalid_id";
}

interface BatchVerifyResponse {
  results: CredentialResult[];
  validCount: number;
  invalidCount: number;
  totalChecked: number;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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

  // 4. Parse and validate request body
  let requestBody: BatchVerifyRequest;
  try {
    requestBody = await req.json();
  } catch {
    const { body, status } = createErrorResponse("BAD_REQUEST", {
      message: "Invalid JSON body",
    });
    return NextResponse.json(body, {
      status,
      headers: rateLimitHeaders,
    });
  }

  if (!requestBody.credentialIds || !Array.isArray(requestBody.credentialIds)) {
    const { body, status } = createErrorResponse("BAD_REQUEST", {
      message: "credentialIds must be an array",
    });
    return NextResponse.json(body, {
      status,
      headers: rateLimitHeaders,
    });
  }

  if (requestBody.credentialIds.length === 0) {
    const { body, status } = createErrorResponse("BAD_REQUEST", {
      message: "credentialIds cannot be empty",
    });
    return NextResponse.json(body, {
      status,
      headers: rateLimitHeaders,
    });
  }

  if (requestBody.credentialIds.length > MAX_BATCH_SIZE) {
    const { body, status } = createErrorResponse("BAD_REQUEST", {
      message: `Maximum batch size is ${MAX_BATCH_SIZE}`,
    });
    return NextResponse.json(body, {
      status,
      headers: rateLimitHeaders,
    });
  }

  const minTier = requestBody.minTier;
  const credentialIds = requestBody.credentialIds;

  try {
    // 5. Get contract instance
    const registry = getCredentialRegistryReader();

    // 6. Verify each credential
    const results: CredentialResult[] = await Promise.all(
      credentialIds.map(async (credentialId): Promise<CredentialResult> => {
        // Validate ID format
        if (!validateCredentialId(credentialId)) {
          return {
            id: credentialId,
            valid: false,
            reason: "invalid_id",
          };
        }

        try {
          // Get credential from contract
          const result = await registry.get_credential(credentialId);

          // Check if exists
          const pubkeyHash = BigInt(result.pubkey_hash?.toString() || "0");
          if (pubkeyHash === 0n) {
            return {
              id: credentialId,
              valid: false,
              reason: "not_found",
            };
          }

          // Parse data
          const tier = Number(result.tier);
          const revoked = Boolean(result.revoked);
          const tierName = TIER_NAMES[tier as keyof typeof TIER_NAMES] || "Unknown";

          // Check if revoked
          if (revoked) {
            return {
              id: credentialId,
              valid: false,
              tier,
              tierName,
              reason: "revoked",
            };
          }

          // Check minimum tier
          if (minTier !== undefined && tier < minTier) {
            return {
              id: credentialId,
              valid: false,
              tier,
              tierName,
              reason: "below_tier",
            };
          }

          return {
            id: credentialId,
            valid: true,
            tier,
            tierName,
          };
        } catch (err) {
          console.error(`[Batch Verify] Error for ${credentialId}:`, err);
          return {
            id: credentialId,
            valid: false,
            reason: "not_found",
          };
        }
      })
    );

    // 7. Calculate stats
    const validCount = results.filter((r) => r.valid).length;
    const invalidCount = results.filter((r) => !r.valid).length;

    const response: BatchVerifyResponse = {
      results,
      validCount,
      invalidCount,
      totalChecked: results.length,
    };

    return NextResponse.json(response, {
      headers: rateLimitHeaders,
    });
  } catch (error) {
    console.error("[/api/v1/credentials/batch-verify] Error:", error);

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

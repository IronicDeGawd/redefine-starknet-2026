/**
 * /api/verify - Verify credentials endpoint
 * Checks if a credential is valid on Starknet
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
import { getTierName } from "@/lib/badges/config";
import { getTxByCredentialId } from "@/lib/redis";
import type { Tier } from "@/types/credential";
import type { VerifyCredentialResponse, ApiError } from "@/types/api";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest
): Promise<NextResponse<VerifyCredentialResponse | ApiError>> {
  try {
    // 1. Check configuration
    if (!isRegistryConfigured()) {
      return NextResponse.json(
        { valid: false, error: "Contract not deployed" },
        { status: 503 }
      );
    }

    // 2. Get credential ID from query params
    const { searchParams } = new URL(req.url);
    const credentialId = searchParams.get("id");

    if (!credentialId) {
      return NextResponse.json(
        { valid: false, error: "Credential ID required" },
        { status: 400 }
      );
    }

    // 3. Validate format
    if (!validateCredentialId(credentialId)) {
      return NextResponse.json(
        { valid: false, error: "Invalid credential ID format" },
        { status: 400 }
      );
    }

    // 4. Get contract instance (read-only, no account needed)
    const registry = getCredentialRegistryReader();

    // 5. Call contract to get credential
    const result = await registry.get_credential(credentialId);

    // 6. Check if credential exists (pubkey_hash = 0 means not found)
    const pubkeyHash = BigInt(result.pubkey_hash?.toString() || "0");
    if (pubkeyHash === 0n) {
      return NextResponse.json({
        valid: false,
        error: "Credential not found",
      });
    }

    // 7. Parse credential data
    const tier = Number(result.tier);
    const issuedAt = Number(result.issued_at);
    const revoked = Boolean(result.revoked);
    const credentialType = feltToString(result.credential_type);

    // 8. Fetch tx hash from Redis (best-effort)
    const transactionHash = await getTxByCredentialId(credentialId) ?? undefined;

    // 9. Format and return
    return NextResponse.json({
      valid: true,
      credential: {
        id: credentialId,
        type: credentialType,
        tier,
        tierName: getTierName(credentialType, tier as Tier),
        issuedAt: new Date(issuedAt * 1000).toISOString(),
        status: revoked ? "revoked" : "active",
        transactionHash,
      },
    });
  } catch (error) {
    console.error("[/api/verify] Error:", error);

    const errorMessage = getErrorMessage(error);

    // Handle contract not deployed or network errors
    if (
      errorMessage.includes("Contract not found") ||
      errorMessage.includes("not deployed")
    ) {
      return NextResponse.json(
        { valid: false, error: "Credential registry not available" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { valid: false, error: "Failed to verify credential" },
      { status: 500 }
    );
  }
}

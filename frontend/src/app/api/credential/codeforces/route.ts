/**
 * /api/credential/codeforces - Issue Codeforces coder tier credentials
 *
 * Reads verified handle from HttpOnly cookie (set by OIDC callback).
 * No fallback — OIDC ownership proof is required.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getCredentialRegistryWriter,
  getProvider,
  isRegistryConfigured,
  isServerAccountConfigured,
} from "@/lib/starknet";
import {
  hashPubkey,
  generateRandomSalt,
  stringToFelt,
  getErrorMessage,
  parseStarknetError,
  isDuplicateError,
  hashToFelt,
} from "@/lib/utils";
import { verifyCodeforces } from "@/lib/connectors/codeforces";
import { createCommitment } from "@/lib/crypto/commitment";
import type { ApiError } from "@/types/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: NextRequest
): Promise<NextResponse<Record<string, unknown> | ApiError>> {
  try {
    if (!isServerAccountConfigured() || !isRegistryConfigured()) {
      return NextResponse.json(
        { success: false, error: "Server not configured" },
        { status: 503 }
      );
    }

    // Read verified handle from OIDC cookie (no fallback — ownership proof required)
    const handle = req.cookies.get("cf_verified_handle")?.value;

    if (!handle) {
      return NextResponse.json(
        { success: false, error: "Codeforces OIDC not completed — please connect via the Codeforces button first" },
        { status: 401 }
      );
    }

    // Validate handle format
    if (!/^[a-zA-Z0-9_.-]{1,24}$/.test(handle)) {
      return NextResponse.json(
        { success: false, error: "Invalid Codeforces handle format" },
        { status: 400 }
      );
    }

    // Verify Codeforces profile via public API
    const verification = await verifyCodeforces(handle);

    if (!verification.success) {
      return NextResponse.json(
        { success: false, error: verification.error || "Failed to verify Codeforces profile" },
        { status: 502 }
      );
    }

    const pubkeyHash = hashPubkey(handle);
    const salt = generateRandomSalt();
    const credentialTypeFelt = stringToFelt("codeforces_coder");
    const verificationHashFelt = hashToFelt(verification.verificationProof.dataHash);

    const commitment = createCommitment(
      pubkeyHash, credentialTypeFelt, verification.tier, verificationHashFelt, salt
    );

    const registry = getCredentialRegistryWriter();
    const provider = getProvider();
    const oracleProviderFelt = stringToFelt("codeforces");

    const tx = await registry.issue_credential(
      pubkeyHash, credentialTypeFelt, verification.tier, salt,
      verificationHashFelt, oracleProviderFelt, commitment
    );

    await provider.waitForTransaction(tx.transaction_hash);

    // Clear OIDC cookies after successful issuance
    const response = NextResponse.json({
      success: true,
      credentialId: `${pubkeyHash.slice(0, 16)}`,
      transactionHash: tx.transaction_hash,
      tier: verification.tier,
      tierName: verification.tierName,
      verified: "oidc",
      profile: verification.profile ? {
        handle: verification.profile.handle,
        rating: verification.profile.rating,
        maxRating: verification.profile.maxRating,
        rank: verification.profile.rank,
      } : undefined,
      verificationProof: {
        oracleProvider: "codeforces",
        queryTimestamp: verification.verificationProof.queryTimestamp,
        proofHash: verification.verificationProof.dataHash,
      },
      commitment,
    });

    response.cookies.delete("cf_verified_handle");
    response.cookies.delete("cf_verified_rating");

    return response;
  } catch (error) {
    console.error("[/api/credential/codeforces] Error:", error);
    const errorMessage = getErrorMessage(error);

    if (isDuplicateError(error)) {
      return NextResponse.json(
        { success: false, error: "A Codeforces credential has already been issued for this handle" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: parseStarknetError(error) },
      { status: 500 }
    );
  }
}

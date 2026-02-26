/**
 * /api/credential/leetcode - Issue LeetCode coder tier credentials
 * No auth needed — uses public GraphQL API
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
  hashToFelt,
} from "@/lib/utils";
import { verifyLeetCode } from "@/lib/connectors/leetcode";
import { createCommitment } from "@/lib/crypto/commitment";
import type { ApiError } from "@/types/api";

export const runtime = "nodejs";
export const maxDuration = 60;

interface LeetCodeCredentialRequest {
  username: string;
}

interface LeetCodeCredentialResponse {
  success: boolean;
  credentialId?: string;
  transactionHash?: string;
  tier?: number;
  tierName?: string;
  profile?: {
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    contestRating: number;
  };
  verificationProof?: {
    oracleProvider: string;
    queryTimestamp: number;
    proofHash: string;
  };
  commitment?: string;
  error?: string;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<LeetCodeCredentialResponse | ApiError>> {
  try {
    // 1. Check configuration
    if (!isServerAccountConfigured()) {
      return NextResponse.json(
        { success: false, error: "Server account not configured" },
        { status: 503 }
      );
    }

    if (!isRegistryConfigured()) {
      return NextResponse.json(
        { success: false, error: "Contract not deployed" },
        { status: 503 }
      );
    }

    // 2. Parse request
    let body: LeetCodeCredentialRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body.username || typeof body.username !== "string") {
      return NextResponse.json(
        { success: false, error: "username is required" },
        { status: 400 }
      );
    }

    // 3. Verify LeetCode profile via public API
    const verification = await verifyLeetCode(body.username.trim());

    if (!verification.success) {
      return NextResponse.json(
        { success: false, error: verification.error || "Failed to verify LeetCode profile" },
        { status: 502 }
      );
    }

    // 4. Hash the username as the pubkey equivalent (privacy: don't store raw username on-chain)
    const pubkeyHash = hashPubkey(body.username);

    // 5. Generate random salt
    const salt = generateRandomSalt();

    // 6. Convert credential type to felt
    const credentialTypeFelt = stringToFelt("leetcode_coder");

    // 7. Create Poseidon commitment (mirrors Cairo contract)
    const verificationHashFelt = hashToFelt(verification.verificationProof.dataHash);
    const commitment = createCommitment(
      pubkeyHash,
      credentialTypeFelt,
      verification.tier,
      verificationHashFelt,
      salt
    );

    // 8. Get contract and issue credential
    const registry = getCredentialRegistryWriter();
    const provider = getProvider();
    const oracleProviderFelt = stringToFelt("leetcode");

    const tx = await registry.issue_credential(
      pubkeyHash,
      credentialTypeFelt,
      verification.tier,
      salt,
      verificationHashFelt,
      oracleProviderFelt,
      commitment
    );

    // 9. Wait for confirmation
    await provider.waitForTransaction(tx.transaction_hash);

    // 10. Return success
    return NextResponse.json({
      success: true,
      credentialId: `${pubkeyHash.slice(0, 16)}`,
      transactionHash: tx.transaction_hash,
      tier: verification.tier,
      tierName: verification.tierName,
      profile: verification.profile ? {
        totalSolved: verification.profile.totalSolved,
        easySolved: verification.profile.easySolved,
        mediumSolved: verification.profile.mediumSolved,
        hardSolved: verification.profile.hardSolved,
        contestRating: verification.profile.contestRating,
      } : undefined,
      verificationProof: {
        oracleProvider: "leetcode",
        queryTimestamp: verification.verificationProof.queryTimestamp,
        proofHash: verification.verificationProof.dataHash,
      },
      commitment,
    });
  } catch (error) {
    console.error("[/api/credential/leetcode] Error:", error);
    const errorMessage = getErrorMessage(error);

    if (errorMessage.toLowerCase().includes("already issued")) {
      return NextResponse.json(
        { success: false, error: "A LeetCode credential has already been issued for this username" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: parseStarknetError(error) },
      { status: 500 }
    );
  }
}

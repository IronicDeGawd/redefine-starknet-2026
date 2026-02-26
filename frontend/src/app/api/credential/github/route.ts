/**
 * /api/credential/github - Issue GitHub developer tier credentials
 * Supports both OAuth flow and public username lookup
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
import { verifyGitHub } from "@/lib/connectors/github";
import { createCommitment } from "@/lib/crypto/commitment";
import type { ApiError } from "@/types/api";

export const runtime = "nodejs";
export const maxDuration = 60;

interface GitHubCredentialRequest {
  username?: string;
  accessToken?: string;
}

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

    let body: GitHubCredentialRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body.username && !body.accessToken) {
      return NextResponse.json(
        { success: false, error: "Either username or accessToken is required" },
        { status: 400 }
      );
    }

    // Verify GitHub profile
    const isOAuth = !!body.accessToken;
    const verification = await verifyGitHub(
      body.accessToken || body.username!,
      isOAuth
    );

    if (!verification.success) {
      return NextResponse.json(
        { success: false, error: verification.error || "Failed to verify GitHub profile" },
        { status: 502 }
      );
    }

    const identifier = verification.profile?.username || body.username!;
    const pubkeyHash = hashPubkey(identifier);
    const salt = generateRandomSalt();
    const credentialTypeFelt = stringToFelt("github_dev");
    const verificationHashFelt = hashToFelt(verification.verificationProof.dataHash);

    const commitment = createCommitment(
      pubkeyHash, credentialTypeFelt, verification.tier, verificationHashFelt, salt
    );

    const registry = getCredentialRegistryWriter();
    const provider = getProvider();
    const oracleProviderFelt = stringToFelt("github");

    const tx = await registry.issue_credential(
      pubkeyHash, credentialTypeFelt, verification.tier, salt,
      verificationHashFelt, oracleProviderFelt, commitment
    );

    await provider.waitForTransaction(tx.transaction_hash);

    return NextResponse.json({
      success: true,
      credentialId: `${pubkeyHash.slice(0, 16)}`,
      transactionHash: tx.transaction_hash,
      tier: verification.tier,
      tierName: verification.tierName,
      profile: verification.profile ? {
        username: verification.profile.username,
        publicRepos: verification.profile.publicRepos,
        totalStars: verification.profile.totalStars,
        contributions: verification.profile.contributions,
      } : undefined,
      verificationProof: {
        oracleProvider: "github",
        queryTimestamp: verification.verificationProof.queryTimestamp,
        proofHash: verification.verificationProof.dataHash,
      },
      commitment,
    });
  } catch (error) {
    console.error("[/api/credential/github] Error:", error);
    const errorMessage = getErrorMessage(error);

    if (errorMessage.toLowerCase().includes("already issued")) {
      return NextResponse.json(
        { success: false, error: "A GitHub credential has already been issued for this user" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: parseStarknetError(error) },
      { status: 500 }
    );
  }
}

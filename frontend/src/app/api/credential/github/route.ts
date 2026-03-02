/**
 * /api/credential/github - Issue GitHub developer tier credentials
 * Requires GitHub OAuth — reads access token from HttpOnly cookie
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
  generateCredentialId,
  stringToFelt,
  parseStarknetError,
  isDuplicateError,
  hashToFelt,
} from "@/lib/utils";
import { verifyGitHub } from "@/lib/connectors/github";
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

    // Read OAuth token from HttpOnly cookie (set by /api/auth/github/callback)
    const accessToken = req.cookies.get("gh_verified_token")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "GitHub OAuth not completed. Please authenticate via GitHub first." },
        { status: 401 }
      );
    }

    // Verify GitHub profile using the authenticated token
    const verification = await verifyGitHub(accessToken, true);

    if (!verification.success) {
      return NextResponse.json(
        { success: false, error: verification.error || "Failed to verify GitHub profile" },
        { status: 502 }
      );
    }

    const identifier = verification.profile?.username;
    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "Could not determine GitHub username from OAuth" },
        { status: 502 }
      );
    }

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

    const receipt = await provider.waitForTransaction(tx.transaction_hash);

    // Extract credential ID from CredentialIssued event
    let credentialId: string | undefined;
    const receiptWithEvents = receipt as { events?: Array<{ keys?: string[] }> };
    if (receiptWithEvents.events?.length) {
      const issuedEvent = receiptWithEvents.events.find((e) =>
        e.keys?.some((k) => k.includes("CredentialIssued"))
      );
      if (issuedEvent?.keys && issuedEvent.keys.length > 1) {
        credentialId = issuedEvent.keys[1];
      }
    }
    if (!credentialId) {
      credentialId = generateCredentialId(pubkeyHash, "github_dev", verification.tier, salt);
    }

    // Clear the OAuth cookie after successful issuance
    const response = NextResponse.json({
      success: true,
      credentialId,
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
    response.cookies.delete("gh_verified_token");
    return response;
  } catch (error) {
    console.error("[/api/credential/github] Error:", error);

    if (isDuplicateError(error)) {
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

/**
 * /api/credential/strava - Issue Strava athlete tier credentials
 *
 * [1.2 FIX] Reads access token from HttpOnly cookie (set by callback)
 * [2.2 FIX] Uses athleteId from cookie (verified during token exchange)
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
  extractCredentialIdFromReceipt,
  stringToFelt,
  getErrorMessage,
  parseStarknetError,
  isDuplicateError,
  hashToFelt,
} from "@/lib/utils";
import { cacheCredential } from "@/lib/redis";
import { verifyStrava } from "@/lib/connectors/strava";
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

    // [1.2 FIX] Read token from HttpOnly cookie, not request body
    const accessToken = req.cookies.get("strava_token")?.value;
    const athleteIdStr = req.cookies.get("strava_athlete_id")?.value;

    if (!accessToken || !athleteIdStr) {
      return NextResponse.json(
        { success: false, error: "Strava OAuth not completed — please connect via the Strava button first" },
        { status: 401 }
      );
    }

    // [2.2 FIX] Use cookie-verified athleteId (from Strava token exchange)
    const athleteId = parseInt(athleteIdStr, 10);
    if (!Number.isInteger(athleteId) || athleteId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid athlete ID" },
        { status: 400 }
      );
    }

    const verification = await verifyStrava(accessToken, athleteId);

    if (!verification.success) {
      return NextResponse.json(
        { success: false, error: verification.error || "Failed to verify Strava profile" },
        { status: 502 }
      );
    }

    const pubkeyHash = hashPubkey(String(athleteId));
    const salt = generateRandomSalt();
    const credentialTypeFelt = stringToFelt("strava_athlete");
    const verificationHashFelt = hashToFelt(verification.verificationProof.dataHash);

    const commitment = createCommitment(
      pubkeyHash, credentialTypeFelt, verification.tier, verificationHashFelt, salt
    );

    const registry = getCredentialRegistryWriter();
    const provider = getProvider();
    const oracleProviderFelt = stringToFelt("strava");

    const tx = await registry.issue_credential(
      pubkeyHash, credentialTypeFelt, verification.tier, salt,
      verificationHashFelt, oracleProviderFelt, commitment
    );

    const receipt = await provider.waitForTransaction(tx.transaction_hash);

    let credentialId = extractCredentialIdFromReceipt(receipt);
    if (!credentialId) {
      credentialId = generateCredentialId(pubkeyHash, "strava_athlete", verification.tier, salt);
    }

    cacheCredential(pubkeyHash, "strava_athlete", {
      credentialId, tier: verification.tier, tierName: verification.tierName,
      transactionHash: tx.transaction_hash,
    });

    // Clear the token cookies after successful issuance
    const response = NextResponse.json({
      success: true,
      credentialId,
      transactionHash: tx.transaction_hash,
      tier: verification.tier,
      tierName: verification.tierName,
      profile: verification.profile ? {
        totalDistanceKm: verification.profile.totalDistanceKm,
        totalActivities: verification.profile.totalActivities,
        totalRunDistanceKm: verification.profile.totalRunDistanceKm,
        totalRideDistanceKm: verification.profile.totalRideDistanceKm,
      } : undefined,
      verificationProof: {
        oracleProvider: "strava",
        queryTimestamp: verification.verificationProof.queryTimestamp,
        proofHash: verification.verificationProof.dataHash,
      },
      commitment,
    });

    // Clean up short-lived cookies
    response.cookies.delete("strava_token");
    response.cookies.delete("strava_athlete_id");

    return response;
  } catch (error) {
    console.error("[/api/credential/strava] Error:", error);
    const errorMessage = getErrorMessage(error);

    if (isDuplicateError(error)) {
      return NextResponse.json(
        { success: false, error: "A Strava credential has already been issued for this athlete" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: parseStarknetError(error) },
      { status: 500 }
    );
  }
}

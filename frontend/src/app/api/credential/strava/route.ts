/**
 * /api/credential/strava - Issue Strava athlete tier credentials
 * Requires OAuth access token from Strava
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
import { verifyStrava } from "@/lib/connectors/strava";
import { createCommitment } from "@/lib/crypto/commitment";
import type { ApiError } from "@/types/api";

export const runtime = "nodejs";
export const maxDuration = 60;

interface StravaCredentialRequest {
  accessToken: string;
  athleteId: number;
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

    let body: StravaCredentialRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body.accessToken || !body.athleteId) {
      return NextResponse.json(
        { success: false, error: "accessToken and athleteId are required" },
        { status: 400 }
      );
    }

    const verification = await verifyStrava(body.accessToken, body.athleteId);

    if (!verification.success) {
      return NextResponse.json(
        { success: false, error: verification.error || "Failed to verify Strava profile" },
        { status: 502 }
      );
    }

    const pubkeyHash = hashPubkey(String(body.athleteId));
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

    await provider.waitForTransaction(tx.transaction_hash);

    return NextResponse.json({
      success: true,
      credentialId: `${pubkeyHash.slice(0, 16)}`,
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
  } catch (error) {
    console.error("[/api/credential/strava] Error:", error);
    const errorMessage = getErrorMessage(error);

    if (errorMessage.toLowerCase().includes("already issued")) {
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

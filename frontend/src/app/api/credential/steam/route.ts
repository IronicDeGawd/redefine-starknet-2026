/**
 * /api/credential/steam - Issue Steam gamer tier credentials
 * Requires STEAM_API_KEY env var
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
import { verifySteam } from "@/lib/connectors/steam";
import { createCommitment } from "@/lib/crypto/commitment";
import type { ApiError } from "@/types/api";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SteamCredentialRequest {
  steamId: string;
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

    const apiKey = process.env.STEAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Steam API key not configured" },
        { status: 503 }
      );
    }

    let body: SteamCredentialRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body.steamId || typeof body.steamId !== "string") {
      return NextResponse.json(
        { success: false, error: "steamId is required" },
        { status: 400 }
      );
    }

    // Verify Steam profile
    const verification = await verifySteam(body.steamId, apiKey);

    if (!verification.success) {
      return NextResponse.json(
        { success: false, error: verification.error || "Failed to verify Steam profile" },
        { status: 502 }
      );
    }

    const pubkeyHash = hashPubkey(body.steamId);
    const salt = generateRandomSalt();
    const credentialTypeFelt = stringToFelt("steam_gamer");
    const verificationHashFelt = hashToFelt(verification.verificationProof.dataHash);

    const commitment = createCommitment(
      pubkeyHash, credentialTypeFelt, verification.tier, verificationHashFelt, salt
    );

    const registry = getCredentialRegistryWriter();
    const provider = getProvider();
    const oracleProviderFelt = stringToFelt("steam");

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
        personaName: verification.profile.personaName,
        gamesOwned: verification.profile.gamesOwned,
        totalPlaytimeHours: verification.profile.totalPlaytimeHours,
      } : undefined,
      verificationProof: {
        oracleProvider: "steam",
        queryTimestamp: verification.verificationProof.queryTimestamp,
        proofHash: verification.verificationProof.dataHash,
      },
      commitment,
    });
  } catch (error) {
    console.error("[/api/credential/steam] Error:", error);
    const errorMessage = getErrorMessage(error);

    if (errorMessage.toLowerCase().includes("already issued")) {
      return NextResponse.json(
        { success: false, error: "A Steam credential has already been issued for this account" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: parseStarknetError(error) },
      { status: 500 }
    );
  }
}

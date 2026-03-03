/**
 * /api/credential/steam - Issue Steam gamer tier credentials
 *
 * [1.4 FIX] Reads steamId from HttpOnly cookie (set by OpenID callback)
 * instead of trusting caller-supplied steamId.
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
import { verifySteam } from "@/lib/connectors/steam";
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

    const apiKey = process.env.STEAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Steam API key not configured" },
        { status: 503 }
      );
    }

    // [1.4 FIX] Read verified steamId from HttpOnly cookie
    const steamId = req.cookies.get("steam_verified_id")?.value;

    if (!steamId) {
      return NextResponse.json(
        { success: false, error: "Steam OpenID not completed — please connect via the Steam button first" },
        { status: 401 }
      );
    }

    // [3.1] Validate steamId format (17-digit number)
    if (!/^\d{17}$/.test(steamId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Steam ID format" },
        { status: 400 }
      );
    }

    // Verify Steam profile
    const verification = await verifySteam(steamId, apiKey);

    if (!verification.success) {
      return NextResponse.json(
        { success: false, error: verification.error || "Failed to verify Steam profile" },
        { status: 502 }
      );
    }

    const pubkeyHash = hashPubkey(steamId);
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

    const receipt = await provider.waitForTransaction(tx.transaction_hash);

    let credentialId = extractCredentialIdFromReceipt(receipt);
    if (!credentialId) {
      credentialId = generateCredentialId(pubkeyHash, "steam_gamer", verification.tier, salt);
    }

    cacheCredential(pubkeyHash, "steam_gamer", {
      credentialId, tier: verification.tier, tierName: verification.tierName,
      transactionHash: tx.transaction_hash,
    });

    // Clear the cookie after successful issuance
    const response = NextResponse.json({
      success: true,
      credentialId,
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

    response.cookies.delete("steam_verified_id");
    return response;
  } catch (error) {
    console.error("[/api/credential/steam] Error:", error);
    const errorMessage = getErrorMessage(error);

    if (isDuplicateError(error)) {
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

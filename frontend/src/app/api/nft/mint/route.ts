/**
 * /api/nft/mint - Mint a badge NFT for a verified credential
 *
 * POST { credentialId, starknetAddress }
 * → { tokenId, transactionHash }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getBadgeNFTWriter,
  getProvider,
  isBadgeNFTConfigured,
  isServerAccountConfigured,
  getCredentialRegistryReader,
} from "@/lib/starknet";
import { getErrorMessage, parseStarknetError } from "@/lib/utils";
import type { ApiError } from "@/types/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: NextRequest
): Promise<NextResponse<Record<string, unknown> | ApiError>> {
  try {
    if (!isServerAccountConfigured() || !isBadgeNFTConfigured()) {
      return NextResponse.json(
        { success: false, error: "NFT contract not configured" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { credentialId, starknetAddress } = body;

    if (!credentialId || typeof credentialId !== "string") {
      return NextResponse.json(
        { success: false, error: "credentialId is required" },
        { status: 400 }
      );
    }

    if (!starknetAddress || typeof starknetAddress !== "string") {
      return NextResponse.json(
        { success: false, error: "starknetAddress is required" },
        { status: 400 }
      );
    }

    // Validate starknet address format
    if (!/^0x[0-9a-fA-F]{1,64}$/.test(starknetAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid Starknet address format" },
        { status: 400 }
      );
    }

    // Pre-validate: check credential exists and isn't revoked
    const registry = getCredentialRegistryReader();
    const credential = await registry.get_credential(credentialId);

    if (!credential || credential.pubkey_hash === 0n) {
      return NextResponse.json(
        { success: false, error: "Credential does not exist" },
        { status: 404 }
      );
    }

    if (credential.revoked) {
      return NextResponse.json(
        { success: false, error: "Credential has been revoked" },
        { status: 400 }
      );
    }

    // Mint the badge NFT
    const badgeNFT = getBadgeNFTWriter();
    const provider = getProvider();

    const tx = await badgeNFT.mint(starknetAddress, credentialId);
    const receipt = await provider.waitForTransaction(tx.transaction_hash);

    // Extract tokenId from events if possible
    let tokenId: string | undefined;
    const events = "events" in receipt ? (receipt as { events?: Array<{ keys?: string[] }> }).events : undefined;
    if (events) {
      for (const event of events) {
        if (event.keys && event.keys.length >= 2) {
          tokenId = event.keys[1];
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      tokenId: tokenId || "pending",
      transactionHash: tx.transaction_hash,
    });
  } catch (error) {
    console.error("[/api/nft/mint] Error:", error);
    const errorMessage = getErrorMessage(error);

    if (errorMessage.includes("already minted") || errorMessage.includes("Badge already")) {
      return NextResponse.json(
        { success: false, error: "A badge has already been minted for this credential" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: parseStarknetError(error) },
      { status: 500 }
    );
  }
}

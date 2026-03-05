/**
 * /api/nft/metadata/[tokenId] - ERC-721 metadata endpoint
 *
 * GET /api/nft/metadata/42 → JSON metadata with image URL
 *
 * The base URL for images is read from NEXT_PUBLIC_APP_URL env var,
 * keeping metadata domain-portable. If the deployment domain changes,
 * update the env var — no contract changes needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { getBadgeNFTReader, isBadgeNFTConfigured } from "@/lib/starknet";
import { CREDENTIAL_CONFIG } from "@/lib/badges/config";
import type { CredentialType, Tier } from "@/types/credential";

export const runtime = "nodejs";

// felt252 short strings → CredentialType mapping
const FELT_TO_TYPE: Record<string, CredentialType> = {
  btc_tier: "btc_tier",
  wallet_age: "wallet_age",
  eth_holder: "eth_holder",
  github_dev: "github_dev",
  codeforces_coder: "codeforces_coder",
  steam_gamer: "steam_gamer",
  strava_athlete: "strava_athlete",
};

function feltToString(felt: bigint): string {
  let hex = felt.toString(16);
  if (hex.length % 2 !== 0) hex = "0" + hex;
  let result = "";
  for (let i = 0; i < hex.length; i += 2) {
    result += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
  }
  return result;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
): Promise<NextResponse> {
  try {
    const { tokenId } = await params;

    if (!tokenId || !/^\d+$/.test(tokenId)) {
      return NextResponse.json({ error: "Invalid token ID" }, { status: 400 });
    }

    if (!isBadgeNFTConfigured()) {
      return NextResponse.json({ error: "NFT contract not configured" }, { status: 503 });
    }

    const badgeNFT = getBadgeNFTReader();
    const [credentialTypeFelt, tier] = await badgeNFT.get_badge_data(tokenId);

    const credentialTypeStr = feltToString(BigInt(credentialTypeFelt));
    const credentialType = FELT_TO_TYPE[credentialTypeStr] || "btc_tier";
    const tierNum = Number(tier) as Tier;

    const config = CREDENTIAL_CONFIG[credentialType];
    const tierInfo = config.tiers[tierNum];

    // Build image URL using app base URL (domain-portable)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://zkcred.xyz";
    const imageUrl = `${baseUrl}${tierInfo.image}`;

    const metadata = {
      name: `ZKCred ${tierInfo.name} Badge #${tokenId}`,
      description: `${config.label} - ${tierInfo.name} Tier (Level ${tierNum}). Verified on-chain via ZKCred credential system on Starknet.`,
      image: imageUrl,
      external_url: `${baseUrl}/credentials`,
      attributes: [
        { trait_type: "Connector", value: config.label },
        { trait_type: "Tier", value: tierInfo.name },
        { trait_type: "Tier Level", value: tierNum, display_type: "number" },
      ],
    };

    return NextResponse.json(metadata, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("[/api/nft/metadata] Error:", error);
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }
}

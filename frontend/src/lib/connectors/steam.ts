/**
 * Steam Connector — OpenID + Web API
 * Queries a user's owned games and playtime to determine gamer tier
 */

export interface SteamProfile {
  steamId: string;
  personaName: string;
  gamesOwned: number;
  totalPlaytimeHours: number;
  profileUrl: string;
}

export interface SteamTierResult {
  success: boolean;
  tier: number;
  tierName: string;
  profile?: SteamProfile;
  verificationProof: {
    oracleProvider: string;
    queryTimestamp: number;
    dataHash: string;
  };
  error?: string;
}

const TIER_NAMES: Record<number, string> = {
  0: "Casual",
  1: "Gamer",
  2: "Hardcore",
  3: "Legend",
};

const TIER_EMOJIS: Record<number, string> = {
  0: "🎮",
  1: "🕹️",
  2: "🎯",
  3: "👾",
};

/**
 * Calculate gamer tier from Steam stats
 * Tier 0: <10 games, <100h total
 * Tier 1: 10-50 games, 100-500h
 * Tier 2: 50-200 games, 500-2000h
 * Tier 3: 200+ games OR 2000+ hours
 */
export function calculateTier(profile: SteamProfile): number {
  if (profile.gamesOwned >= 200 || profile.totalPlaytimeHours >= 2000) return 3;
  if (profile.gamesOwned >= 50 || profile.totalPlaytimeHours >= 500) return 2;
  if (profile.gamesOwned >= 10 || profile.totalPlaytimeHours >= 100) return 1;
  return 0;
}

/**
 * Generate Steam OpenID login URL
 */
export function getOpenIDUrl(returnUrl: string): string {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnUrl,
    "openid.realm": new URL(returnUrl).origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `https://steamcommunity.com/openid/login?${params.toString()}`;
}

/**
 * Extract SteamID from OpenID callback
 */
export function extractSteamId(claimedId: string): string | null {
  const match = claimedId.match(/\/id\/(\d+)$/);
  return match ? match[1] : null;
}

/**
 * Validate OpenID response from Steam
 */
export async function validateOpenID(params: Record<string, string>): Promise<string | null> {
  const validationParams = new URLSearchParams({
    ...params,
    "openid.mode": "check_authentication",
  });

  const response = await fetch("https://steamcommunity.com/openid/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: validationParams.toString(),
  });

  const text = await response.text();

  if (text.includes("is_valid:true")) {
    return extractSteamId(params["openid.claimed_id"] || "");
  }

  return null;
}

/**
 * Get player's owned games and playtime via Steam Web API
 */
export async function getPlayerGames(
  steamId: string,
  apiKey: string
): Promise<SteamProfile> {
  // 1. Get player summary
  const summaryUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;
  const summaryRes = await fetch(summaryUrl);

  if (!summaryRes.ok) {
    throw new Error(`Steam API error: ${summaryRes.status}`);
  }

  const summaryData = await summaryRes.json();
  const player = summaryData.response?.players?.[0];

  if (!player) {
    throw new Error("Steam player not found");
  }

  // 2. Get owned games (requires public profile)
  const gamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json`;
  const gamesRes = await fetch(gamesUrl);

  let gamesOwned = 0;
  let totalPlaytimeMinutes = 0;

  if (gamesRes.ok) {
    const gamesData = await gamesRes.json();
    gamesOwned = gamesData.response?.game_count || 0;

    if (gamesData.response?.games) {
      for (const game of gamesData.response.games) {
        totalPlaytimeMinutes += game.playtime_forever || 0;
      }
    }
  }

  return {
    steamId,
    personaName: player.personaname || "Unknown",
    gamesOwned,
    totalPlaytimeHours: Math.round(totalPlaytimeMinutes / 60),
    profileUrl: player.profileurl || "",
  };
}

/**
 * Fetch Steam profile using steamId and API key
 * Full verification flow
 */
export async function verifySteam(
  steamId: string,
  apiKey: string
): Promise<SteamTierResult> {
  try {
    const profile = await getPlayerGames(steamId, apiKey);
    const tier = calculateTier(profile);
    const queryTimestamp = Date.now();

    const dataString = `${steamId}:${profile.gamesOwned}:${profile.totalPlaytimeHours}:${queryTimestamp}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(dataString));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const dataHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return {
      success: true,
      tier,
      tierName: TIER_NAMES[tier],
      profile,
      verificationProof: {
        oracleProvider: "steam",
        queryTimestamp,
        dataHash,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      tier: 0,
      tierName: "Unknown",
      verificationProof: {
        oracleProvider: "steam",
        queryTimestamp: Date.now(),
        dataHash: "",
      },
      error: message,
    };
  }
}

export { TIER_NAMES, TIER_EMOJIS };

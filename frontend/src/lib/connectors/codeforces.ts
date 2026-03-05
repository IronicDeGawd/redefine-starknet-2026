/**
 * Codeforces Connector — OIDC token exchange + Public API profile fetch
 * Uses Codeforces OIDC for ownership proof, public API for rating data
 */

export interface CodeforcesProfile {
  handle: string;
  rating: number;
  maxRating: number;
  rank: string;
  maxRank: string;
  contribution: number;
  friendOfCount: number;
}

export interface CodeforcesTierResult {
  success: boolean;
  tier: number;
  tierName: string;
  profile?: CodeforcesProfile;
  verificationProof: {
    oracleProvider: string;
    queryTimestamp: number;
    dataHash: string;
  };
  error?: string;
}

const TIER_NAMES: Record<number, string> = {
  0: "Newbie",
  1: "Specialist",
  2: "Expert",
  3: "Master",
};

/**
 * Calculate coder tier from Codeforces rating
 * Tier 0: rating < 1200 (Newbie / Pupil)
 * Tier 1: 1200-1599 (Specialist / Expert)
 * Tier 2: 1600-1999 (Expert / Candidate Master)
 * Tier 3: 2000+ (Master / International Master / Grandmaster / Legendary Grandmaster)
 */
export function calculateTier(profile: CodeforcesProfile): number {
  if (profile.rating >= 2000) return 3;
  if (profile.rating >= 1600) return 2;
  if (profile.rating >= 1200) return 1;
  return 0;
}

/**
 * Exchange an OIDC authorization code for tokens.
 * Returns the decoded handle and rating from the ID token.
 */
export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ handle: string; rating: number; avatar: string }> {
  const response = await fetch("https://codeforces.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Codeforces token exchange failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const idToken = data.id_token;

  if (!idToken) {
    throw new Error("No id_token in Codeforces response");
  }

  // Decode JWT payload (HS256 — we trust the token since it came directly from Codeforces)
  const payloadB64 = idToken.split(".")[1];
  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString("utf-8")
  );

  if (!payload.handle) {
    throw new Error("No handle claim in Codeforces ID token");
  }

  return {
    handle: payload.handle,
    rating: payload.rating || 0,
    avatar: payload.avatar || "",
  };
}

/**
 * Fetch a Codeforces user's profile via public API
 */
export async function getProfile(handle: string): Promise<CodeforcesProfile> {
  const response = await fetch(
    `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
    { signal: AbortSignal.timeout(10000) }
  );

  if (!response.ok) {
    throw new Error(`Codeforces API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK" || !data.result?.length) {
    throw new Error(`Codeforces user "${handle}" not found`);
  }

  const user = data.result[0];

  return {
    handle: user.handle,
    rating: user.rating || 0,
    maxRating: user.maxRating || 0,
    rank: user.rank || "unrated",
    maxRank: user.maxRank || "unrated",
    contribution: user.contribution || 0,
    friendOfCount: user.friendOfCount || 0,
  };
}

/**
 * Full verification flow: fetch profile → calculate tier → generate proof
 */
export async function verifyCodeforces(handle: string): Promise<CodeforcesTierResult> {
  try {
    const profile = await getProfile(handle);
    const tier = calculateTier(profile);
    const queryTimestamp = Date.now();

    // Create a hash of the verification data for the commitment
    const dataString = `${handle}:${profile.rating}:${profile.maxRating}:${queryTimestamp}`;
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
        oracleProvider: "codeforces",
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
        oracleProvider: "codeforces",
        queryTimestamp: Date.now(),
        dataHash: "",
      },
      error: message,
    };
  }
}

export { TIER_NAMES };

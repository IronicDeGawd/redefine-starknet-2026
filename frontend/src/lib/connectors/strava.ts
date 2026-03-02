/**
 * Strava Connector — OAuth 2.0
 * Queries athlete stats to determine fitness tier
 */

export interface StravaProfile {
  athleteId: number;
  firstName: string;
  lastName: string;
  totalRunDistanceKm: number;
  totalRideDistanceKm: number;
  totalActivities: number;
  totalDistanceKm: number;
}

export interface StravaTierResult {
  success: boolean;
  tier: number;
  tierName: string;
  profile?: StravaProfile;
  verificationProof: {
    oracleProvider: string;
    queryTimestamp: number;
    dataHash: string;
  };
  error?: string;
}

const TIER_NAMES: Record<number, string> = {
  0: "Sneaker",
  1: "Runner",
  2: "Mountain",
  3: "Peak",
};

/**
 * Calculate athlete tier from total distance
 * Tier 0: <50km
 * Tier 1: 50-500km
 * Tier 2: 500-2000km
 * Tier 3: 2000+ km
 */
export function calculateTier(totalDistanceKm: number): number {
  if (totalDistanceKm >= 2000) return 3;
  if (totalDistanceKm >= 500) return 2;
  if (totalDistanceKm >= 50) return 1;
  return 0;
}

/**
 * Generate Strava OAuth authorization URL
 */
export function getAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "activity:read,read",
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; athleteId: number }> {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Strava OAuth error: ${response.status}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    athleteId: data.athlete?.id || 0,
  };
}

/**
 * Fetch athlete stats using access token
 */
export async function getAthleteStats(
  accessToken: string,
  athleteId: number
): Promise<StravaProfile> {
  // Get athlete profile
  const profileRes = await fetch("https://www.strava.com/api/v3/athlete", {
    headers: { "Authorization": `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000), // [3.5 FIX]
  });

  if (!profileRes.ok) {
    throw new Error(`Strava API error: ${profileRes.status}`);
  }

  const profile = await profileRes.json();

  // Get athlete stats (all-time totals)
  const statsRes = await fetch(
    `https://www.strava.com/api/v3/athletes/${athleteId}/stats`,
    { headers: { "Authorization": `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10000) }
  );

  let totalRunDistance = 0;
  let totalRideDistance = 0;
  let totalActivities = 0;

  if (statsRes.ok) {
    const stats = await statsRes.json();
    totalRunDistance = (stats.all_run_totals?.distance || 0) / 1000; // meters to km
    totalRideDistance = (stats.all_ride_totals?.distance || 0) / 1000;
    totalActivities =
      (stats.all_run_totals?.count || 0) +
      (stats.all_ride_totals?.count || 0) +
      (stats.all_swim_totals?.count || 0);
  }

  return {
    athleteId: profile.id,
    firstName: profile.firstname || "",
    lastName: profile.lastname || "",
    totalRunDistanceKm: Math.round(totalRunDistance),
    totalRideDistanceKm: Math.round(totalRideDistance),
    totalActivities,
    totalDistanceKm: Math.round(totalRunDistance + totalRideDistance),
  };
}

/**
 * Full verification flow (requires OAuth access token)
 */
export async function verifyStrava(
  accessToken: string,
  athleteId: number
): Promise<StravaTierResult> {
  try {
    const profile = await getAthleteStats(accessToken, athleteId);
    const tier = calculateTier(profile.totalDistanceKm);
    const queryTimestamp = Date.now();

    const dataString = `${profile.athleteId}:${profile.totalDistanceKm}:${profile.totalActivities}:${queryTimestamp}`;
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
        oracleProvider: "strava",
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
        oracleProvider: "strava",
        queryTimestamp: Date.now(),
        dataHash: "",
      },
      error: message,
    };
  }
}

export { TIER_NAMES };

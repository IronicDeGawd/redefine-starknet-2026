/**
 * LeetCode Connector — Public GraphQL API (no auth needed!)
 * Queries a user's solve stats to determine coder tier
 */

export interface LeetCodeProfile {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  ranking: number;
  contestRating: number;
  contestAttended: number;
}

export interface LeetCodeTierResult {
  success: boolean;
  tier: number;
  tierName: string;
  profile?: LeetCodeProfile;
  verificationProof: {
    oracleProvider: string;
    queryTimestamp: number;
    dataHash: string;
  };
  error?: string;
}

const TIER_NAMES: Record<number, string> = {
  0: "Beginner",
  1: "Solver",
  2: "Expert",
  3: "Guardian",
};

const TIER_EMOJIS: Record<number, string> = {
  0: "🌱",
  1: "🧩",
  2: "🧠",
  3: "👑",
};

/**
 * Calculate coder tier from LeetCode stats
 * Tier 0: <50 problems
 * Tier 1: 50-200 problems
 * Tier 2: 200-500 problems OR contest rating 1600+
 * Tier 3: 500+ problems OR contest rating 2000+
 */
export function calculateTier(profile: LeetCodeProfile): number {
  // Contest rating takes priority for higher tiers
  if (profile.contestRating >= 2000 || profile.totalSolved >= 500) return 3;
  if (profile.contestRating >= 1600 || profile.totalSolved >= 200) return 2;
  if (profile.totalSolved >= 50) return 1;
  return 0;
}

/**
 * Fetch a LeetCode user's profile via public GraphQL API
 * No auth token needed — completely public data
 */
export async function getProfile(username: string): Promise<LeetCodeProfile> {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
        profile {
          ranking
        }
      }
      userContestRanking(username: $username) {
        rating
        attendedContestsCount
      }
    }
  `;

  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Some basic headers to avoid CORS/blocking
      "Referer": "https://leetcode.com",
    },
    body: JSON.stringify({
      query,
      variables: { username },
    }),
    signal: AbortSignal.timeout(10000), // [3.5 FIX] 10s timeout
  });

  if (!response.ok) {
    throw new Error(`LeetCode API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.data?.matchedUser) {
    throw new Error(`LeetCode user "${username}" not found`);
  }

  const user = data.data.matchedUser;
  const submissions = user.submitStats?.acSubmissionNum || [];
  const contestData = data.data.userContestRanking;

  // Parse submission stats by difficulty
  let easySolved = 0, mediumSolved = 0, hardSolved = 0, totalSolved = 0;
  for (const sub of submissions) {
    switch (sub.difficulty) {
      case "All": totalSolved = sub.count; break;
      case "Easy": easySolved = sub.count; break;
      case "Medium": mediumSolved = sub.count; break;
      case "Hard": hardSolved = sub.count; break;
    }
  }

  return {
    username: user.username,
    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    ranking: user.profile?.ranking || 0,
    contestRating: contestData?.rating || 0,
    contestAttended: contestData?.attendedContestsCount || 0,
  };
}

/**
 * Full verification flow: fetch profile → calculate tier → generate proof
 */
export async function verifyLeetCode(username: string): Promise<LeetCodeTierResult> {
  try {
    const profile = await getProfile(username);
    const tier = calculateTier(profile);
    const queryTimestamp = Date.now();

    // Create a hash of the verification data for the commitment
    // [3.2 FIX] Round contestRating to int for reproducible hashes
    const dataString = `${username}:${profile.totalSolved}:${Math.round(profile.contestRating)}:${queryTimestamp}`;
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
        oracleProvider: "leetcode",
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
        oracleProvider: "leetcode",
        queryTimestamp: Date.now(),
        dataHash: "",
      },
      error: message,
    };
  }
}

export { TIER_NAMES, TIER_EMOJIS };

/**
 * GitHub Connector — OAuth + REST/GraphQL API
 * Queries a user's repos, stars, and contributions to determine developer tier
 */

export interface GitHubProfile {
  username: string;
  publicRepos: number;
  totalStars: number;
  followers: number;
  contributions: number;
  accountAge: number; // in days
}

export interface GitHubTierResult {
  success: boolean;
  tier: number;
  tierName: string;
  profile?: GitHubProfile;
  verificationProof: {
    oracleProvider: string;
    queryTimestamp: number;
    dataHash: string;
  };
  error?: string;
}

const TIER_NAMES: Record<number, string> = {
  0: "Newbie",
  1: "Builder",
  2: "Veteran",
  3: "Elite",
};

const TIER_EMOJIS: Record<number, string> = {
  0: "🌱",
  1: "🔨",
  2: "⭐",
  3: "🏆",
};

/**
 * Calculate developer tier from GitHub stats
 * Tier 0: <5 repos, <50 contributions
 * Tier 1: 5-20 repos, 50-500 contributions
 * Tier 2: 20-50 repos, 500-2000 contributions
 * Tier 3: 50+ repos OR 2000+ contributions OR 100+ stars
 */
export function calculateTier(profile: GitHubProfile): number {
  if (
    profile.publicRepos >= 50 ||
    profile.contributions >= 2000 ||
    profile.totalStars >= 100
  ) return 3;
  if (
    profile.publicRepos >= 20 ||
    profile.contributions >= 500
  ) return 2;
  if (
    profile.publicRepos >= 5 ||
    profile.contributions >= 50
  ) return 1;
  return 0;
}

/**
 * Generate GitHub OAuth authorization URL
 */
export function getAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

/**
 * Fetch GitHub profile data using access token
 */
export async function getProfile(accessToken: string): Promise<GitHubProfile> {
  // 1. Get basic user info
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.github.v3+json",
    },
  });

  if (!userRes.ok) {
    throw new Error(`GitHub API error: ${userRes.status}`);
  }

  const user = await userRes.json();

  // 2. Get repos to count total stars
  let totalStars = 0;
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 5) { // Cap at 5 pages (500 repos)
    const reposRes = await fetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}&type=owner`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.github.v3+json",
        },
      }
    );

    if (!reposRes.ok) break;

    const repos = await reposRes.json();
    if (repos.length === 0) {
      hasMore = false;
    } else {
      for (const repo of repos) {
        totalStars += repo.stargazers_count || 0;
      }
      page++;
    }
  }

  // 3. Get contribution count via GraphQL
  let contributions = 0;
  try {
    const graphqlRes = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query {
            viewer {
              contributionsCollection {
                contributionCalendar {
                  totalContributions
                }
              }
            }
          }
        `,
      }),
    });

    if (graphqlRes.ok) {
      const graphqlData = await graphqlRes.json();
      contributions = graphqlData.data?.viewer?.contributionsCollection?.contributionCalendar?.totalContributions || 0;
    }
  } catch {
    // GraphQL might not be available if scope is limited, fall back to repo count * estimate
    contributions = user.public_repos * 10;
  }

  const accountAge = Math.floor(
    (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    username: user.login,
    publicRepos: user.public_repos || 0,
    totalStars,
    followers: user.followers || 0,
    contributions,
    accountAge,
  };
}

/**
 * Fetch profile using just a username (public API, no auth needed)
 * Fallback for when OAuth is not configured
 */
export async function getPublicProfile(username: string): Promise<GitHubProfile> {
  const userRes = await fetch(`https://api.github.com/users/${username}`, {
    headers: { "Accept": "application/vnd.github.v3+json" },
  });

  if (!userRes.ok) {
    if (userRes.status === 404) {
      throw new Error(`GitHub user "${username}" not found`);
    }
    throw new Error(`GitHub API error: ${userRes.status}`);
  }

  const user = await userRes.json();

  // Get stars from public repos
  let totalStars = 0;
  const reposRes = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=stars`,
    { headers: { "Accept": "application/vnd.github.v3+json" } }
  );

  if (reposRes.ok) {
    const repos = await reposRes.json();
    for (const repo of repos) {
      totalStars += repo.stargazers_count || 0;
    }
  }

  const accountAge = Math.floor(
    (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    username: user.login,
    publicRepos: user.public_repos || 0,
    totalStars,
    followers: user.followers || 0,
    contributions: user.public_repos * 10, // Estimate without GraphQL
    accountAge,
  };
}

/**
 * Full verification flow
 */
export async function verifyGitHub(
  accessTokenOrUsername: string,
  isOAuth: boolean = false
): Promise<GitHubTierResult> {
  try {
    const profile = isOAuth
      ? await getProfile(accessTokenOrUsername)
      : await getPublicProfile(accessTokenOrUsername);

    const tier = calculateTier(profile);
    const queryTimestamp = Date.now();

    const dataString = `${profile.username}:${profile.publicRepos}:${profile.totalStars}:${profile.contributions}:${queryTimestamp}`;
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
        oracleProvider: "github",
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
        oracleProvider: "github",
        queryTimestamp: Date.now(),
        dataHash: "",
      },
      error: message,
    };
  }
}

export { TIER_NAMES, TIER_EMOJIS };

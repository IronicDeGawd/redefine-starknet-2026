/**
 * Credential types for ZKCred
 */

export type CredentialType =
  | "btc_tier"
  | "wallet_age"
  | "eth_holder"
  | "github_dev"
  | "codeforces_coder"
  | "steam_gamer"
  | "strava_athlete";

export type Tier = 0 | 1 | 2 | 3;

export const TIER_NAMES: Record<Tier, string> = {
  0: "Shrimp",
  1: "Crab",
  2: "Fish",
  3: "Whale",
} as const;

export const TIER_RANGES: Record<Tier, string> = {
  0: "< 1 BTC",
  1: "1-10 BTC",
  2: "10-100 BTC",
  3: "100+ BTC",
} as const;

export const CREDENTIAL_TIER_NAMES: Record<CredentialType, Record<Tier, string>> = {
  btc_tier:         { 0: "Shrimp", 1: "Crab", 2: "Fish", 3: "Whale" },
  wallet_age:       { 0: "Newbie", 1: "Veteran", 2: "Hodler", 3: "OG" },
  eth_holder:       { 0: "Dust", 1: "Holder", 2: "Stacker", 3: "Whale" },
  github_dev:       { 0: "Seedling", 1: "Hammer", 2: "Star", 3: "Trophy" },
  codeforces_coder: { 0: "Newbie", 1: "Specialist", 2: "Expert", 3: "Master" },
  steam_gamer:      { 0: "Casual", 1: "Gamer", 2: "Hardcore", 3: "Legend" },
  strava_athlete:   { 0: "Sneaker", 1: "Runner", 2: "Mountain", 3: "Peak" },
};

export const CREDENTIAL_TIER_RANGES: Record<CredentialType, Record<Tier, string>> = {
  btc_tier:         { 0: "< 1 BTC", 1: "1-10 BTC", 2: "10-100 BTC", 3: "100+ BTC" },
  wallet_age:       { 0: "< 30 days", 1: "30-180 days", 2: "180-365 days", 3: "1+ year" },
  eth_holder:       { 0: "< 0.1 ETH", 1: "0.1-1 ETH", 2: "1-10 ETH", 3: "10+ ETH" },
  github_dev:       { 0: "< 5 repos", 1: "5-20 repos", 2: "20-50 repos", 3: "50+ repos" },
  codeforces_coder: { 0: "< 1200", 1: "1200-1599", 2: "1600-1999", 3: "2000+" },
  steam_gamer:      { 0: "< 10 games", 1: "10-50 games", 2: "50-200 games", 3: "200+ games" },
  strava_athlete:   { 0: "< 100 km", 1: "100-500 km", 2: "500-2000 km", 3: "2000+ km" },
};

export interface Credential {
  id: string;
  pubkeyHash: string;
  credentialType: CredentialType;
  tier: Tier;
  issuedAt: string;
  revoked: boolean;
  nftTokenId?: string;
}

export interface CredentialOnChain {
  pubkey_hash: bigint;
  credential_type: bigint;
  tier: number;
  issued_at: bigint;
  revoked: boolean;
}

export type CredentialStatus = "active" | "revoked";

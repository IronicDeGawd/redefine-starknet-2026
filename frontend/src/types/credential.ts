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

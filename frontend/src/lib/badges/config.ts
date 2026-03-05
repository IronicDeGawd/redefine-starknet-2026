/**
 * Centralized badge configuration for all credential connectors.
 * Maps (credentialType, tier) → image path, tier name, label, palette.
 */

import type { CredentialType, Tier } from "@/types/credential";

export interface TierInfo {
  name: string;
  image: string;
}

export interface ConnectorConfig {
  label: string;
  description: string;
  tiers: Record<Tier, TierInfo>;
  palette: Record<Tier, string>;
}

export const CREDENTIAL_CONFIG: Record<CredentialType, ConnectorConfig> = {
  btc_tier: {
    label: "BTC Holdings",
    description: "Bitcoin balance tier",
    tiers: {
      0: { name: "Shrimp", image: "/badges/btc/shrimp.png" },
      1: { name: "Crab", image: "/badges/btc/crab.png" },
      2: { name: "Fish", image: "/badges/btc/fish.png" },
      3: { name: "Whale", image: "/badges/btc/whale.png" },
    },
    palette: { 0: "#CD7F32", 1: "#9B59B6", 2: "#27AE60", 3: "#F1C40F" },
  },
  wallet_age: {
    label: "Wallet Age",
    description: "Bitcoin wallet age tier",
    tiers: {
      0: { name: "Newbie", image: "/badges/btc/shrimp.png" },
      1: { name: "Veteran", image: "/badges/btc/crab.png" },
      2: { name: "Hodler", image: "/badges/btc/fish.png" },
      3: { name: "OG", image: "/badges/btc/whale.png" },
    },
    palette: { 0: "#CD7F32", 1: "#9B59B6", 2: "#27AE60", 3: "#F1C40F" },
  },
  eth_holder: {
    label: "ETH Holdings",
    description: "Ethereum balance tier",
    tiers: {
      0: { name: "Dust", image: "/badges/eth/dust.png" },
      1: { name: "Holder", image: "/badges/eth/shard.png" },
      2: { name: "Stacker", image: "/badges/eth/diamond.png" },
      3: { name: "Whale", image: "/badges/eth/whale+diamond.png" },
    },
    palette: { 0: "#CD7F32", 1: "#9B59B6", 2: "#27AE60", 3: "#F1C40F" },
  },
  github_dev: {
    label: "GitHub Dev",
    description: "GitHub developer tier",
    tiers: {
      0: { name: "Seedling", image: "/badges/github/seeding.png" },
      1: { name: "Hammer", image: "/badges/github/hammer.png" },
      2: { name: "Star", image: "/badges/github/star.png" },
      3: { name: "Trophy", image: "/badges/github/trophy.png" },
    },
    palette: { 0: "#CD7F32", 1: "#9B59B6", 2: "#27AE60", 3: "#F1C40F" },
  },
  codeforces_coder: {
    label: "Codeforces Coder",
    description: "Codeforces competitive programming tier",
    tiers: {
      0: { name: "Newbie", image: "/badges/codeforces/newbie.png" },
      1: { name: "Specialist", image: "/badges/codeforces/specialist.png" },
      2: { name: "Expert", image: "/badges/codeforces/expert.png" },
      3: { name: "Master", image: "/badges/codeforces/master.png" },
    },
    palette: { 0: "#808080", 1: "#03A89E", 2: "#0000FF", 3: "#FF8C00" },
  },
  steam_gamer: {
    label: "Steam Gamer",
    description: "Steam gaming tier",
    tiers: {
      0: { name: "Casual", image: "/badges/steam/basic+controller.png" },
      1: { name: "Gamer", image: "/badges/steam/intermediate+controller.png" },
      2: { name: "Hardcore", image: "/badges/steam/advanced+controller.png" },
      3: { name: "Legend", image: "/badges/steam/crown+controller.png" },
    },
    palette: { 0: "#CD7F32", 1: "#9B59B6", 2: "#27AE60", 3: "#F1C40F" },
  },
  strava_athlete: {
    label: "Strava Athlete",
    description: "Strava fitness tier",
    tiers: {
      0: { name: "Sneaker", image: "/badges/strava/sneaker.png" },
      1: { name: "Runner", image: "/badges/strava/runner.png" },
      2: { name: "Mountain", image: "/badges/strava/mountain.png" },
      3: { name: "Peak", image: "/badges/strava/crown+mountain.png" },
    },
    palette: { 0: "#CD7F32", 1: "#9B59B6", 2: "#27AE60", 3: "#F1C40F" },
  },
};

/** Get tier info for a credential type and tier level */
export function getBadgeInfo(credentialType: CredentialType, tier: Tier): TierInfo {
  return CREDENTIAL_CONFIG[credentialType].tiers[tier];
}

/** Get the display label for a credential type */
export function getCredentialLabel(credentialType: CredentialType): string {
  return CREDENTIAL_CONFIG[credentialType].label;
}

/** Get the tier name for a credential type and tier level */
export function getTierName(credentialType: CredentialType | string, tier: Tier): string {
  const config = CREDENTIAL_CONFIG[credentialType as CredentialType];
  return config?.tiers[tier]?.name ?? `Tier ${tier}`;
}

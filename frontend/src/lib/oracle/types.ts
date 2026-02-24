/**
 * Oracle types for BTC balance and wallet verification
 */

export interface BalanceResponse {
  address: string;
  confirmedBalance: number; // in satoshis
  unconfirmedBalance: number; // in satoshis
  totalBalance: number; // confirmed + unconfirmed in satoshis
  btcBalance: number; // total in BTC
}

export interface AddressInfo {
  address: string;
  chain_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
  mempool_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
}

export interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  vin: unknown[];
  vout: unknown[];
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

export interface WalletAgeInfo {
  address: string;
  firstTxTimestamp: number | null; // Unix timestamp of first tx
  firstTxHash: string | null;
  ageInDays: number;
  ageTier: number;
}

export interface OracleProvider {
  name: string;
  getBalance(address: string): Promise<BalanceResponse>;
  getAddressInfo(address: string): Promise<AddressInfo>;
  getFirstTransaction(address: string): Promise<Transaction | null>;
  getWalletAge(address: string): Promise<WalletAgeInfo>;
}

export interface VerificationResult {
  success: boolean;
  tier: number;
  tierName: string;
  verificationProof: {
    oracleProvider: string;
    queryTimestamp: number;
    balanceHash: string; // Hash of balance for privacy
    address: string; // For reference (will be hashed before storage)
  };
  error?: string;
}

// Tier thresholds in BTC
export const BTC_TIER_THRESHOLDS = {
  SHRIMP: { min: 0, max: 1, tier: 0, name: "Shrimp" },
  CRAB: { min: 1, max: 10, tier: 1, name: "Crab" },
  FISH: { min: 10, max: 100, tier: 2, name: "Fish" },
  WHALE: { min: 100, max: Infinity, tier: 3, name: "Whale" },
} as const;

// Wallet age thresholds in days
export const WALLET_AGE_THRESHOLDS = {
  NEWBIE: { min: 0, max: 30, tier: 0, name: "Newbie" },
  HODLER: { min: 30, max: 180, tier: 1, name: "Hodler" },
  VETERAN: { min: 180, max: 365, tier: 2, name: "Veteran" },
  OG: { min: 365, max: Infinity, tier: 3, name: "OG" },
} as const;

export function getTierFromBalance(btcBalance: number): {
  tier: number;
  name: string;
} {
  if (btcBalance >= 100) return { tier: 3, name: "Whale" };
  if (btcBalance >= 10) return { tier: 2, name: "Fish" };
  if (btcBalance >= 1) return { tier: 1, name: "Crab" };
  return { tier: 0, name: "Shrimp" };
}

export function getTierFromAge(ageInDays: number): {
  tier: number;
  name: string;
} {
  if (ageInDays >= 365) return { tier: 3, name: "OG" };
  if (ageInDays >= 180) return { tier: 2, name: "Veteran" };
  if (ageInDays >= 30) return { tier: 1, name: "Hodler" };
  return { tier: 0, name: "Newbie" };
}

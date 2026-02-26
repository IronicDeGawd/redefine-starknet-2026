/**
 * Balance Verifier Service
 * Verifies BTC balance and generates verification proofs
 * Supports mock tiers via MOCK_TIERS env for demo addresses
 */

import { MempoolProvider } from "./providers/mempool";
import { getTierFromBalance, type VerificationResult } from "./types";

// Use Web Crypto API for hashing (available in Node.js 18+ and browsers)
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Parse MOCK_TIERS env variable
 * Format: "address1:tier,address2:tier"
 */
function getMockTiers(): Map<string, number> {
  const mockTiers = new Map<string, number>();
  const raw = process.env.MOCK_TIERS;
  if (!raw) return mockTiers;

  for (const entry of raw.split(",")) {
    const [address, tierStr] = entry.trim().split(":");
    if (address && tierStr) {
      const tier = parseInt(tierStr, 10);
      if (tier >= 0 && tier <= 3) {
        mockTiers.set(address.trim(), tier);
      }
    }
  }
  return mockTiers;
}

const TIER_NAMES: Record<number, string> = {
  0: "Shrimp",
  1: "Crab",
  2: "Fish",
  3: "Whale",
};

export interface VerifyBalanceOptions {
  address: string;
  network?: "mainnet" | "testnet";
}

/**
 * Verify BTC balance for an address and return tier with proof
 * Checks mock tiers first, then falls back to real oracle
 */
export async function verifyBalance(
  options: VerifyBalanceOptions
): Promise<VerificationResult> {
  const { address, network = "mainnet" } = options;

  // Check mock tiers for demo addresses
  const mockTiers = getMockTiers();
  if (mockTiers.has(address)) {
    const tier = mockTiers.get(address)!;
    const queryTimestamp = Date.now();
    const balanceHash = await sha256(
      `${address}:mock:${queryTimestamp}`
    );

    return {
      success: true,
      tier,
      tierName: TIER_NAMES[tier] || "Unknown",
      verificationProof: {
        oracleProvider: "mock",
        queryTimestamp,
        balanceHash,
        address,
      },
    };
  }

  // Real oracle verification
  try {
    const provider = new MempoolProvider(network);
    const balance = await provider.getBalance(address);

    const { tier, name } = getTierFromBalance(balance.btcBalance);

    const queryTimestamp = Date.now();
    const balanceHash = await sha256(
      // [4.1 FIX] Hash confirmedBalance to match tier computation
      `${address}:${balance.confirmedBalance}:${queryTimestamp}`
    );

    return {
      success: true,
      tier,
      tierName: name,
      verificationProof: {
        oracleProvider: provider.name,
        queryTimestamp,
        balanceHash,
        address,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      tier: 0,
      tierName: "Unknown",
      verificationProof: {
        oracleProvider: "mempool.space",
        queryTimestamp: Date.now(),
        balanceHash: "",
        address,
      },
      error: message,
    };
  }
}

/**
 * Verify that an address meets a minimum tier requirement
 */
export async function verifyMinimumTier(
  address: string,
  minTier: number,
  network: "mainnet" | "testnet" = "mainnet"
): Promise<{
  meets: boolean;
  actualTier: number;
  actualTierName: string;
  verificationProof: VerificationResult["verificationProof"];
}> {
  const result = await verifyBalance({ address, network });

  return {
    meets: result.success && result.tier >= minTier,
    actualTier: result.tier,
    actualTierName: result.tierName,
    verificationProof: result.verificationProof,
  };
}

/**
 * Get raw balance without tier calculation (for debugging)
 */
export async function getRawBalance(
  address: string,
  network: "mainnet" | "testnet" = "mainnet"
) {
  const provider = new MempoolProvider(network);
  return provider.getBalance(address);
}

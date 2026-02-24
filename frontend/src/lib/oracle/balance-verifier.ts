/**
 * Balance Verifier Service
 * Verifies BTC balance and generates verification proofs
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

export interface VerifyBalanceOptions {
  address: string;
  network?: "mainnet" | "testnet";
}

/**
 * Verify BTC balance for an address and return tier with proof
 */
export async function verifyBalance(
  options: VerifyBalanceOptions
): Promise<VerificationResult> {
  const { address, network = "mainnet" } = options;

  try {
    const provider = new MempoolProvider(network);
    const balance = await provider.getBalance(address);

    const { tier, name } = getTierFromBalance(balance.btcBalance);

    // Create a hash of the balance for privacy
    // This proves we queried the balance without revealing it
    const queryTimestamp = Date.now();
    const balanceHash = await sha256(
      `${address}:${balance.totalBalance}:${queryTimestamp}`
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

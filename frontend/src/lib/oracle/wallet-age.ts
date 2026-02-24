/**
 * Wallet Age Verifier Service
 * Verifies wallet age based on first transaction
 */

import { MempoolProvider } from "./providers/mempool";
import { getTierFromAge, type WalletAgeInfo } from "./types";

// Use Web Crypto API for hashing
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface WalletAgeVerificationResult {
  success: boolean;
  tier: number;
  tierName: string;
  ageInDays: number;
  firstTxTimestamp: number | null;
  firstTxHash: string | null;
  verificationProof: {
    oracleProvider: string;
    queryTimestamp: number;
    ageHash: string;
    address: string;
  };
  error?: string;
}

/**
 * Verify wallet age for an address
 */
export async function verifyWalletAge(
  address: string,
  network: "mainnet" | "testnet" = "mainnet"
): Promise<WalletAgeVerificationResult> {
  try {
    const provider = new MempoolProvider(network);
    const ageInfo = await provider.getWalletAge(address);

    const { tier, name } = getTierFromAge(ageInfo.ageInDays);

    // Create a hash of the age for privacy
    const queryTimestamp = Date.now();
    const ageHash = await sha256(
      `${address}:${ageInfo.firstTxTimestamp}:${queryTimestamp}`
    );

    return {
      success: true,
      tier,
      tierName: name,
      ageInDays: ageInfo.ageInDays,
      firstTxTimestamp: ageInfo.firstTxTimestamp,
      firstTxHash: ageInfo.firstTxHash,
      verificationProof: {
        oracleProvider: provider.name,
        queryTimestamp,
        ageHash,
        address,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      tier: 0,
      tierName: "Newbie",
      ageInDays: 0,
      firstTxTimestamp: null,
      firstTxHash: null,
      verificationProof: {
        oracleProvider: "mempool.space",
        queryTimestamp: Date.now(),
        ageHash: "",
        address,
      },
      error: message,
    };
  }
}

/**
 * Get wallet age info without tier calculation
 */
export async function getWalletAgeInfo(
  address: string,
  network: "mainnet" | "testnet" = "mainnet"
): Promise<WalletAgeInfo> {
  const provider = new MempoolProvider(network);
  return provider.getWalletAge(address);
}

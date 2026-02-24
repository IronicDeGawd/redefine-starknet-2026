/**
 * Oracle module for BTC balance and wallet age verification
 */

// Types
export * from "./types";

// Providers
export { MempoolProvider, mempoolProvider, mempoolTestnetProvider } from "./providers/mempool";

// Balance verification
export { verifyBalance, verifyMinimumTier, getRawBalance } from "./balance-verifier";

// Wallet age verification
export { verifyWalletAge, getWalletAgeInfo } from "./wallet-age";
export type { WalletAgeVerificationResult } from "./wallet-age";

/**
 * Server-side Starknet account for issuing credentials
 */

import { Account } from "starknet";
import { getProvider } from "./provider";

let serverAccount: Account | null = null;

/**
 * Get the server account for issuing credentials (singleton)
 * This account pays for gas on credential issuance
 */
export function getServerAccount(): Account {
  if (!serverAccount) {
    const provider = getProvider();

    const address = process.env.STARKNET_ACCOUNT_ADDRESS;
    const privateKey = process.env.STARKNET_PRIVATE_KEY;

    if (!address || !privateKey) {
      throw new Error(
        "STARKNET_ACCOUNT_ADDRESS and STARKNET_PRIVATE_KEY must be set"
      );
    }

    serverAccount = new Account({
      provider,
      address,
      signer: privateKey,
    });
  }
  return serverAccount;
}

/**
 * Check if server account is configured
 */
export function isServerAccountConfigured(): boolean {
  return !!(
    process.env.STARKNET_ACCOUNT_ADDRESS && process.env.STARKNET_PRIVATE_KEY
  );
}

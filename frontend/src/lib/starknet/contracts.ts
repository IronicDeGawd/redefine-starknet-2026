/**
 * Starknet contract instances
 */

import { Contract, Account, ProviderInterface, type Abi } from "starknet";
import { getProvider } from "./provider";
import { getServerAccount } from "./account";
import { CREDENTIAL_REGISTRY_ABI } from "./abi/credential-registry";

/**
 * Get the CredentialRegistry contract address
 */
function getRegistryAddress(): string {
  const address = process.env.CREDENTIAL_REGISTRY_ADDRESS;
  if (!address) {
    throw new Error("CREDENTIAL_REGISTRY_ADDRESS must be set");
  }
  return address;
}

/**
 * Get CredentialRegistry contract for read operations
 */
export function getCredentialRegistryReader(): Contract {
  const provider = getProvider();
  const address = getRegistryAddress();
  return new Contract({
    abi: CREDENTIAL_REGISTRY_ABI as Abi,
    address,
    providerOrAccount: provider,
  });
}

/**
 * Get CredentialRegistry contract for write operations
 * Uses server account for paying gas
 */
export function getCredentialRegistryWriter(): Contract {
  const account = getServerAccount();
  const address = getRegistryAddress();
  return new Contract({
    abi: CREDENTIAL_REGISTRY_ABI as Abi,
    address,
    providerOrAccount: account,
  });
}

/**
 * Get CredentialRegistry contract with custom provider/account
 */
export function getCredentialRegistry(
  providerOrAccount?: ProviderInterface | Account
): Contract {
  const address = getRegistryAddress();
  const provider = providerOrAccount || getProvider();
  return new Contract({
    abi: CREDENTIAL_REGISTRY_ABI as Abi,
    address,
    providerOrAccount: provider,
  });
}

/**
 * Check if registry address is configured
 */
export function isRegistryConfigured(): boolean {
  return !!process.env.CREDENTIAL_REGISTRY_ADDRESS;
}

/**
 * Starknet RPC Provider setup
 */

import { RpcProvider } from "starknet";

const RPC_URLS: Record<string, string> = {
  sepolia: "https://starknet-sepolia.public.blastapi.io/rpc/v0_7",
  mainnet: "https://starknet-mainnet.public.blastapi.io/rpc/v0_7",
};

let providerInstance: RpcProvider | null = null;

/**
 * Get the Starknet RPC provider (singleton)
 */
export function getProvider(): RpcProvider {
  if (!providerInstance) {
    const network = process.env.NEXT_PUBLIC_STARKNET_NETWORK || "sepolia";
    const nodeUrl =
      process.env.STARKNET_RPC_URL || RPC_URLS[network] || RPC_URLS.sepolia;

    providerInstance = new RpcProvider({ nodeUrl });
  }
  return providerInstance;
}

/**
 * Get the block explorer URL for a transaction
 */
export function getExplorerTxUrl(txHash: string): string {
  const network = process.env.NEXT_PUBLIC_STARKNET_NETWORK || "sepolia";
  const baseUrl =
    network === "mainnet"
      ? "https://starkscan.co"
      : "https://sepolia.starkscan.co";
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Get the block explorer URL for a contract
 */
export function getExplorerContractUrl(address: string): string {
  const network = process.env.NEXT_PUBLIC_STARKNET_NETWORK || "sepolia";
  const baseUrl =
    network === "mainnet"
      ? "https://starkscan.co"
      : "https://sepolia.starkscan.co";
  return `${baseUrl}/contract/${address}`;
}

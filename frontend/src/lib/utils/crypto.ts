/**
 * Cryptographic utilities for ZKCred
 */

import { hash, num, shortString } from "starknet";

/**
 * Hash a BTC public key using Poseidon for Starknet compatibility
 */
export function hashPubkey(pubkey: string): string {
  // Remove 0x prefix if present
  const cleanPubkey = pubkey.startsWith("0x") ? pubkey.slice(2) : pubkey;

  // Split pubkey into chunks that fit in felt252 (< 2^251)
  // A BTC pubkey is 33 bytes (compressed) or 65 bytes (uncompressed)
  // We split into 32-byte chunks and hash together
  const chunks: string[] = [];
  for (let i = 0; i < cleanPubkey.length; i += 62) {
    // 31 bytes = 62 hex chars
    chunks.push("0x" + cleanPubkey.slice(i, i + 62).padEnd(62, "0"));
  }

  // Use Poseidon hash for ZK-friendliness
  return hash.computePoseidonHashOnElements(chunks.map((c) => BigInt(c)));
}

/**
 * Generate a random salt for credential ID generation
 */
export function generateRandomSalt(): string {
  const randomBytes = new Uint8Array(31); // 31 bytes fits in felt252
  crypto.getRandomValues(randomBytes);
  return "0x" + Buffer.from(randomBytes).toString("hex");
}

/**
 * Generate a credential ID from components
 */
export function generateCredentialId(
  pubkeyHash: string,
  credentialType: string,
  tier: number,
  salt: string
): string {
  const typeAsFelt = stringToFelt(credentialType);
  return hash.computePoseidonHashOnElements([
    BigInt(pubkeyHash),
    BigInt(typeAsFelt),
    BigInt(tier),
    BigInt(salt),
  ]);
}

/**
 * Convert a short string to felt252
 */
export function stringToFelt(str: string): string {
  return shortString.encodeShortString(str);
}

/**
 * Convert a felt252 to string
 */
export function feltToString(felt: bigint | string): string {
  const feltStr = typeof felt === "bigint" ? num.toHex(felt) : felt;
  try {
    return shortString.decodeShortString(feltStr);
  } catch {
    return feltStr;
  }
}

/**
 * Format a credential ID for display (truncated)
 */
export function formatCredentialId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}...${id.slice(-6)}`;
}

/**
 * Validate a hex string
 */
export function isValidHex(str: string): boolean {
  const hexRegex = /^(0x)?[0-9a-fA-F]+$/;
  return hexRegex.test(str);
}

/**
 * Normalize a hex string (ensure 0x prefix)
 */
export function normalizeHex(str: string): string {
  if (!str) return "0x0";
  return str.startsWith("0x") ? str : `0x${str}`;
}

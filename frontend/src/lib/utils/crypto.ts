/**
 * Cryptographic utilities for ZKCred
 */

import { hash, num, shortString } from "starknet";
import { Verifier } from "bip322-js";

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

/**
 * Convert a hex hash string to a felt252-compatible value.
 * Truncates to 31 bytes (248 bits) to fit within felt252 (< 2^251).
 */
export function hashToFelt(hexHash: string): string {
  const clean = hexHash.startsWith("0x") ? hexHash.slice(2) : hexHash;
  // Take first 62 hex chars (31 bytes) to fit in felt252
  return "0x" + clean.slice(0, 62);
}

/**
 * Verify a BIP-322 Bitcoin signature against a message and address.
 * Uses bip322-js which handles all address types (P2WPKH, P2SH-P2WPKH, P2TR)
 * and both ECDSA (legacy) and BIP-322 (SegWit/Taproot) signature formats.
 *
 * @param message - The original message that was signed
 * @param signature - The base64-encoded signature from the wallet
 * @param address - The Bitcoin address that signed the message
 * @returns true if signature is valid
 */
export function verifyBitcoinSignature(
  message: string,
  signature: string,
  address: string
): boolean {
  try {
    // Skip verification for mock signatures (development/testing)
    if (signature.startsWith("mock_signature_")) {
      console.warn("Accepting mock signature for development");
      return true;
    }

    return Verifier.verifySignature(address, message, signature);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Cryptographic utilities for ZKCred
 */

import { hash, num, shortString } from "starknet";
import * as secp256k1 from "@noble/secp256k1";
import { createHash } from "crypto";

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
 * Bitcoin message magic prefix for signed messages
 */
const BITCOIN_MESSAGE_MAGIC = "\x18Bitcoin Signed Message:\n";

/**
 * SHA256 hash using Node.js crypto
 */
function sha256(data: Uint8Array | Buffer): Uint8Array {
  return new Uint8Array(createHash("sha256").update(data).digest());
}

/**
 * Create the Bitcoin message hash (double SHA256 with magic prefix)
 */
function createBitcoinMessageHash(message: string): Uint8Array {
  const messageBytes = new TextEncoder().encode(message);
  const magicBytes = new TextEncoder().encode(BITCOIN_MESSAGE_MAGIC);
  const lengthByte = new Uint8Array([messageBytes.length]);

  // Construct: magic + length + message
  const fullMessage = new Uint8Array(
    magicBytes.length + lengthByte.length + messageBytes.length
  );
  fullMessage.set(magicBytes, 0);
  fullMessage.set(lengthByte, magicBytes.length);
  fullMessage.set(messageBytes, magicBytes.length + lengthByte.length);

  // Double SHA256
  return sha256(sha256(fullMessage));
}

/**
 * Verify a Bitcoin signature against a message and public key
 *
 * @param message - The original message that was signed
 * @param signature - The signature in hex format (with or without recovery byte)
 * @param pubkey - The public key in hex format (compressed or uncompressed)
 * @returns true if signature is valid
 */
export async function verifyBitcoinSignature(
  message: string,
  signature: string,
  pubkey: string
): Promise<boolean> {
  try {
    const messageHash = createBitcoinMessageHash(message);

    // Clean up signature - remove 0x prefix if present
    let sigHex = signature.startsWith("0x") ? signature.slice(2) : signature;

    // Handle different signature formats
    let sigBytes: Uint8Array;

    if (sigHex.length === 130) {
      // 65 bytes: recovery byte + r + s (Bitcoin signed message format)
      sigBytes = hexToBytes(sigHex.slice(2)); // Skip recovery byte
    } else if (sigHex.length === 128) {
      // 64 bytes: r + s (raw ECDSA format)
      sigBytes = hexToBytes(sigHex);
    } else {
      console.error("Invalid signature length:", sigHex.length);
      return false;
    }

    // Clean up pubkey
    const pubkeyHex = pubkey.startsWith("0x") ? pubkey.slice(2) : pubkey;
    const pubkeyBytes = hexToBytes(pubkeyHex);

    // Verify signature
    return secp256k1.verify(sigBytes, messageHash, pubkeyBytes);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

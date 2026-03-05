/**
 * Server-side EIP-191 Ethereum signature verification.
 * Uses @noble/curves + @noble/hashes (both already installed).
 */

import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";

/**
 * Verify an EIP-191 personal_sign signature.
 * Recovers the signer address from (message, signature) and compares to expectedAddress.
 */
export function verifyEthSignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    // Dev-mode mock bypass
    if (
      process.env.NODE_ENV === "development" &&
      signature.startsWith("mock_eth_sig_")
    ) {
      console.warn("[DEV ONLY] Accepting mock ETH signature");
      return true;
    }

    // 1. EIP-191 prefix
    const msgBytes = new TextEncoder().encode(message);
    const prefix = `\x19Ethereum Signed Message:\n${msgBytes.length}`;
    const prefixBytes = new TextEncoder().encode(prefix);

    // 2. Concatenate prefix + message and hash
    const combined = new Uint8Array(prefixBytes.length + msgBytes.length);
    combined.set(prefixBytes, 0);
    combined.set(msgBytes, prefixBytes.length);
    const msgHash = keccak_256(combined);

    // 3. Parse signature (remove 0x prefix if present)
    const sigHex = signature.startsWith("0x") ? signature.slice(2) : signature;
    if (sigHex.length !== 130) return false; // 65 bytes = 130 hex chars

    const r = sigHex.slice(0, 64);
    const s = sigHex.slice(64, 128);
    const vHex = sigHex.slice(128, 130);
    let v = parseInt(vHex, 16);

    // Normalize v: MetaMask returns 27/28, some wallets return 0/1
    if (v >= 27) v -= 27;
    if (v !== 0 && v !== 1) return false;

    // 4. Recover uncompressed public key (65 bytes starting with 0x04)
    const compactSig = secp256k1.Signature.fromHex(r + s).addRecoveryBit(v);
    const pubkeyBytes = compactSig.recoverPublicKey(msgHash).toBytes(false);

    // 5. Derive address: keccak256(uncompressed pubkey without 04 prefix) → last 20 bytes
    const uncompressed = pubkeyBytes.slice(1); // remove 0x04 prefix
    const addrHash = keccak_256(uncompressed);
    const recoveredAddress =
      "0x" +
      Array.from(addrHash.slice(-20))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    // 6. Case-insensitive comparison
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error("ETH signature verification error:", error);
    return false;
  }
}

/**
 * Validate that a challenge message timestamp is within the allowed window.
 */
export function isTimestampValid(
  message: string,
  maxAgeMs: number = 5 * 60 * 1000
): boolean {
  const match = message.match(/Timestamp:\s*(\d+)/);
  if (!match) return false;
  const ts = parseInt(match[1], 10);
  return Date.now() - ts < maxAgeMs;
}

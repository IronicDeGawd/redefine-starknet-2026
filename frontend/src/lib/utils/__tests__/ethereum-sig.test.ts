/**
 * Tests for EIP-191 Ethereum signature verification.
 *
 * Uses @noble/curves/secp256k1 (has built-in hashing, no config needed)
 * to generate test signatures, then verifies them through the production
 * verifyEthSignature function from ethereum-sig.ts.
 */

import { describe, it, expect } from "vitest";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { verifyEthSignature, isTimestampValid } from "@/lib/utils/ethereum-sig";

// ── helpers ─────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2)
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function deriveEthAddress(uncompressedPubkey65: Uint8Array): string {
  const raw = uncompressedPubkey65.slice(1);
  const hash = keccak_256(raw);
  return "0x" + bytesToHex(hash.slice(-20));
}

function eip191Hash(message: string): Uint8Array {
  const msgBytes = new TextEncoder().encode(message);
  const prefix = `\x19Ethereum Signed Message:\n${msgBytes.length}`;
  const prefixBytes = new TextEncoder().encode(prefix);
  const combined = new Uint8Array(prefixBytes.length + msgBytes.length);
  combined.set(prefixBytes, 0);
  combined.set(msgBytes, prefixBytes.length);
  return keccak_256(combined);
}

/** Simulate MetaMask personal_sign: returns 0x + r(32) + s(32) + v(1) */
function personalSign(message: string, secretKey: Uint8Array): string {
  const msgHash = eip191Hash(message);
  // @noble/curves sign returns a Signature object with r, s, recovery
  const sig = secp256k1.sign(msgHash, secretKey, { lowS: true });
  const rHex = sig.r.toString(16).padStart(64, "0");
  const sHex = sig.s.toString(16).padStart(64, "0");
  const vHex = (sig.recovery + 27).toString(16).padStart(2, "0");
  return "0x" + rHex + sHex + vHex;
}

// ── Test data ───────────────────────────────────────────────────────

// Hardhat account #0 — well-known test key, not secret
const PRIVKEY = hexToBytes(
  "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
);
const PUBKEY = secp256k1.getPublicKey(PRIVKEY, false);
const ADDRESS = deriveEthAddress(PUBKEY);
const MSG = `ZKCred: Verify ETH wallet\nAddress: ${ADDRESS}\nTimestamp: 1709337600000`;

// ── Tests ───────────────────────────────────────────────────────────

describe("@noble/curves recovery (proving fix approach)", () => {
  it("recovers correct address using @noble/curves Signature API", () => {
    const sig = personalSign(MSG, PRIVKEY);
    const sigHex = sig.slice(2);
    const r = sigHex.slice(0, 64);
    const s = sigHex.slice(64, 128);
    let v = parseInt(sigHex.slice(128, 130), 16);
    if (v >= 27) v -= 27;

    const msgHash = eip191Hash(MSG);
    const recovered = secp256k1.Signature.fromCompact(r + s)
      .addRecoveryBit(v)
      .recoverPublicKey(msgHash)
      .toRawBytes(false);
    const addr = deriveEthAddress(recovered);
    expect(addr.toLowerCase()).toBe(ADDRESS.toLowerCase());
  });
});

describe("verifyEthSignature", () => {
  it("verifies a valid signature", () => {
    const sig = personalSign(MSG, PRIVKEY);
    expect(verifyEthSignature(MSG, sig, ADDRESS)).toBe(true);
  });

  it("rejects wrong address", () => {
    const sig = personalSign(MSG, PRIVKEY);
    expect(verifyEthSignature(MSG, sig, "0x" + "00".repeat(20))).toBe(false);
  });

  it("works with v=0/1 format (no +27)", () => {
    const sig = personalSign(MSG, PRIVKEY);
    const recovery = parseInt(sig.slice(-2), 16) - 27;
    const sigV01 = sig.slice(0, -2) + recovery.toString(16).padStart(2, "0");
    expect(verifyEthSignature(MSG, sigV01, ADDRESS)).toBe(true);
  });

  it("rejects tampered message", () => {
    const sig = personalSign(MSG, PRIVKEY);
    expect(verifyEthSignature(MSG + " tampered", sig, ADDRESS)).toBe(false);
  });

  it("rejects short signature", () => {
    expect(verifyEthSignature(MSG, "0x" + "ab".repeat(64), ADDRESS)).toBe(
      false
    );
  });

  it("works without 0x prefix", () => {
    const sig = personalSign(MSG, PRIVKEY);
    expect(verifyEthSignature(MSG, sig.slice(2), ADDRESS)).toBe(true);
  });

  it("rejects signature from different key", () => {
    const privkey2 = secp256k1.utils.randomPrivateKey();
    const sig2 = personalSign(MSG, privkey2);
    expect(verifyEthSignature(MSG, sig2, ADDRESS)).toBe(false);
  });

  it("second keypair self-verifies", () => {
    const privkey2 = secp256k1.utils.randomPrivateKey();
    const addr2 = deriveEthAddress(secp256k1.getPublicKey(privkey2, false));
    const sig2 = personalSign(MSG, privkey2);
    expect(verifyEthSignature(MSG, sig2, addr2)).toBe(true);
  });

  it("rejects empty signature", () => {
    expect(verifyEthSignature(MSG, "", ADDRESS)).toBe(false);
  });

  it("rejects invalid v=99", () => {
    const sig = personalSign(MSG, PRIVKEY);
    const badSig = sig.slice(0, -2) + "63"; // 0x63 = 99
    expect(verifyEthSignature(MSG, badSig, ADDRESS)).toBe(false);
  });

  it("address comparison is case-insensitive", () => {
    const sig = personalSign(MSG, PRIVKEY);
    expect(verifyEthSignature(MSG, sig, ADDRESS.toUpperCase())).toBe(true);
    expect(verifyEthSignature(MSG, sig, ADDRESS.toLowerCase())).toBe(true);
  });
});

describe("isTimestampValid", () => {
  it("accepts recent timestamp", () => {
    const msg = `Something\nTimestamp: ${Date.now()}`;
    expect(isTimestampValid(msg)).toBe(true);
  });

  it("rejects expired timestamp", () => {
    const msg = `Something\nTimestamp: ${Date.now() - 10 * 60 * 1000}`;
    expect(isTimestampValid(msg)).toBe(false);
  });

  it("rejects message without timestamp", () => {
    expect(isTimestampValid("no timestamp here")).toBe(false);
  });
});

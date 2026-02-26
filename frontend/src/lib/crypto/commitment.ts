/**
 * Poseidon Commitment Utilities
 * Mirrors the Cairo contract's commitment scheme
 * commitment = Poseidon(pubkey_hash, credential_type, tier, verification_hash, salt)
 */

import { hash } from "starknet";

/**
 * Create a Poseidon commitment that matches the Cairo contract's logic
 * This is the binding commitment stored on-chain — tamper-evident
 */
export function createCommitment(
  pubkeyHash: string,
  credentialType: string,
  tier: number,
  verificationHash: string,
  salt: string
): string {
  return hash.computePoseidonHashOnElements([
    BigInt(pubkeyHash),
    BigInt(credentialType),
    BigInt(tier),
    BigInt(verificationHash),
    BigInt(salt),
  ]);
}

/**
 * Verify a commitment matches expected preimage values
 * Used for client-side verification before on-chain check
 */
export function verifyCommitment(
  commitment: string,
  pubkeyHash: string,
  credentialType: string,
  tier: number,
  verificationHash: string,
  salt: string
): boolean {
  const recomputed = createCommitment(
    pubkeyHash,
    credentialType,
    tier,
    verificationHash,
    salt
  );
  return BigInt(recomputed) === BigInt(commitment);
}

/**
 * Create a nullifier to prevent double-use of a credential
 * nullifier = Poseidon(commitment, secret)
 */
export function createNullifier(commitment: string, secret: string): string {
  return hash.computePoseidonHashOnElements([
    BigInt(commitment),
    BigInt(secret),
  ]);
}

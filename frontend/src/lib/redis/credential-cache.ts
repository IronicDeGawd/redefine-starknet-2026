/**
 * Redis-based credential ID persistence.
 * Stores credential metadata after on-chain issuance so it can be
 * recovered if the frontend loses the ID (localStorage cleared, etc.).
 */

import { getRedisClient } from "./client";

export interface CachedCredential {
  credentialId: string;
  tier: number;
  tierName?: string;
  transactionHash: string;
  issuedAt: string;
}

const KEY_PREFIX = "zkcred:credential";
const TX_PREFIX = "zkcred:tx";

function credentialKey(pubkeyHash: string, credentialType: string): string {
  return `${KEY_PREFIX}:${pubkeyHash}:${credentialType}`;
}

function txKey(credentialId: string): string {
  return `${TX_PREFIX}:${credentialId}`;
}

/**
 * Cache credential metadata after successful on-chain issuance.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function cacheCredential(
  pubkeyHash: string,
  credentialType: string,
  data: Omit<CachedCredential, "issuedAt">
): Promise<void> {
  try {
    const client = getRedisClient();
    const value: CachedCredential = { ...data, issuedAt: new Date().toISOString() };
    await client.set(credentialKey(pubkeyHash, credentialType), JSON.stringify(value));
  } catch (err) {
    console.error("[credential-cache] Failed to cache:", err);
  }
}

/**
 * Retrieve cached credential metadata for recovery.
 * Returns null if not found or Redis unavailable.
 */
export async function getCachedCredential(
  pubkeyHash: string,
  credentialType: string
): Promise<CachedCredential | null> {
  try {
    const client = getRedisClient();
    const raw = await client.get(credentialKey(pubkeyHash, credentialType));
    if (!raw) return null;
    return JSON.parse(raw) as CachedCredential;
  } catch (err) {
    console.error("[credential-cache] Failed to read:", err);
    return null;
  }
}

/**
 * Cache transaction hash by credential ID for explorer links.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function cacheTxByCredentialId(
  credentialId: string,
  transactionHash: string
): Promise<void> {
  try {
    const client = getRedisClient();
    await client.set(txKey(credentialId), transactionHash);
  } catch (err) {
    console.error("[credential-cache] Failed to cache tx:", err);
  }
}

/**
 * Get transaction hash for a credential ID.
 * Returns null if not found or Redis unavailable.
 */
export async function getTxByCredentialId(
  credentialId: string
): Promise<string | null> {
  try {
    const client = getRedisClient();
    return await client.get(txKey(credentialId));
  } catch (err) {
    console.error("[credential-cache] Failed to read tx:", err);
    return null;
  }
}

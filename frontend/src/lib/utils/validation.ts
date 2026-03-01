/**
 * Input validation utilities for ZKCred
 */

import type { ChatRequest, IssueCredentialRequest } from "@/types/api";
import type { CredentialType, Tier } from "@/types/credential";
import { isValidHex } from "./crypto";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a chat request
 */
export function validateChatRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const request = body as Partial<ChatRequest>;

  if (!Array.isArray(request.messages)) {
    return { valid: false, error: "messages must be an array" };
  }

  if (request.messages.length === 0) {
    return { valid: false, error: "messages cannot be empty" };
  }

  for (const msg of request.messages) {
    if (!msg.role || !["user", "assistant"].includes(msg.role)) {
      return { valid: false, error: "Invalid message role" };
    }
    if (typeof msg.content !== "string") {
      return { valid: false, error: "Message content must be a string" };
    }
  }

  // Validate tool results if present
  if (request.toolResults) {
    if (!Array.isArray(request.toolResults)) {
      return { valid: false, error: "toolResults must be an array" };
    }
    for (const tr of request.toolResults) {
      if (!tr.toolUseId || typeof tr.toolUseId !== "string") {
        return { valid: false, error: "Invalid toolUseId" };
      }
    }
  }

  return { valid: true };
}

/**
 * Validate an issue credential request
 */
export function validateIssueRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const request = body as Partial<IssueCredentialRequest>;

  // Validate BTC public key
  if (!request.btcPubkey || typeof request.btcPubkey !== "string") {
    return { valid: false, error: "btcPubkey is required" };
  }
  if (!isValidHex(request.btcPubkey)) {
    return { valid: false, error: "btcPubkey must be a valid hex string" };
  }

  // Validate BTC address
  if (!request.btcAddress || typeof request.btcAddress !== "string") {
    return { valid: false, error: "btcAddress is required" };
  }

  // Validate signature (base64 from BIP-322 or hex from legacy)
  if (!request.signature || typeof request.signature !== "string") {
    return { valid: false, error: "signature is required" };
  }

  // Validate message
  if (!request.message || typeof request.message !== "string") {
    return { valid: false, error: "message is required" };
  }

  // Validate credential type
  if (!isValidCredentialType(request.credentialType)) {
    return { valid: false, error: "credentialType must be 'btc_tier' or 'wallet_age'" };
  }

  // Validate tier
  if (!isValidTier(request.tier)) {
    return { valid: false, error: "tier must be 0, 1, 2, or 3" };
  }

  // Validate optional Starknet address
  if (request.starknetAddress !== undefined) {
    if (typeof request.starknetAddress !== "string") {
      return { valid: false, error: "starknetAddress must be a string" };
    }
    if (!isValidHex(request.starknetAddress)) {
      return { valid: false, error: "starknetAddress must be a valid hex string" };
    }
  }

  return { valid: true };
}

/**
 * Validate a credential ID
 */
export function validateCredentialId(id: unknown): boolean {
  if (!id || typeof id !== "string") {
    return false;
  }
  return isValidHex(id);
}

const VALID_CREDENTIAL_TYPES: Set<string> = new Set([
  "btc_tier", "wallet_age", "eth_holder", "github_dev",
  "codeforces_coder", "steam_gamer", "strava_athlete",
]);

/**
 * Check if a value is a valid credential type
 */
export function isValidCredentialType(
  value: unknown
): value is CredentialType {
  return typeof value === "string" && VALID_CREDENTIAL_TYPES.has(value);
}

/**
 * Check if a value is a valid tier
 */
export function isValidTier(value: unknown): value is Tier {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

/**
 * Sanitize a string for safe display
 */
export function sanitizeString(str: string, maxLength = 1000): string {
  if (!str) return "";
  // Remove null bytes and control characters
  const sanitized = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return sanitized.slice(0, maxLength);
}

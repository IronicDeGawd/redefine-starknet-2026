/**
 * API request/response types for ZKCred
 */

import type { CredentialType, Tier, CredentialStatus } from "./credential";

// ============ Chat API ============

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ToolResult {
  toolUseId: string;
  result: unknown;
}

export interface ChatRequest {
  messages: ChatMessage[];
  toolResults?: ToolResult[];
}

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ChatResponse {
  type: "text" | "tool_use";
  content?: string;
  toolUse?: ToolUse;
}

// ============ Credential API ============

export interface IssueCredentialRequest {
  btcPubkey: string;
  btcAddress: string;
  signature: string;
  message: string;
  credentialType: CredentialType;
  tier: Tier;
  starknetAddress?: string;
}

export interface IssueCredentialResponse {
  success: boolean;
  credentialId?: string;
  transactionHash?: string;
  error?: string;
}

// ============ Verify API ============

export interface VerifyCredentialResponse {
  valid: boolean;
  credential?: {
    id: string;
    type: string;
    tier: number;
    tierName: string;
    issuedAt: string;
    status: CredentialStatus;
  };
  error?: string;
}

// ============ Error Response ============

export interface ApiError {
  error: string;
  code?: string;
}

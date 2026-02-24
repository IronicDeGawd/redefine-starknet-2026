/**
 * Agent types for ZKCred AI assistant
 */

import type { CredentialType, Tier } from "./credential";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ToolResultInput {
  toolUseId: string;
  result: unknown;
}

export interface AgentResponse {
  type: "text" | "tool_use";
  content?: string;
  toolUse?: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
}

// ============ Tool Input Schemas ============

export interface ConnectBtcWalletInput {
  // No inputs required
}

export interface RequestSignatureInput {
  credentialType: CredentialType;
  tier: Tier;
}

export interface IssueCredentialInput {
  btcPubkey: string;
  signature: string;
  message: string;
  credentialType: CredentialType;
  tier: Tier;
}

export interface VerifyCredentialInput {
  credentialId: string;
}

export interface ConnectStarknetWalletInput {
  // No inputs required
}

// ============ Tool Output Schemas ============

export interface ConnectBtcWalletOutput {
  success: boolean;
  address?: string;
  publicKey?: string;
  error?: string;
}

export interface RequestSignatureOutput {
  success: boolean;
  signature?: string;
  message?: string;
  publicKey?: string;
  error?: string;
}

export interface IssueCredentialOutput {
  success: boolean;
  credentialId?: string;
  transactionHash?: string;
  error?: string;
}

export interface VerifyCredentialOutput {
  valid: boolean;
  credential?: {
    id: string;
    type: string;
    tier: number;
    tierName: string;
    issuedAt: string;
    status: string;
  };
  error?: string;
}

export interface ConnectStarknetWalletOutput {
  success: boolean;
  address?: string;
  error?: string;
}

export type ToolName =
  | "connect_btc_wallet"
  | "request_signature"
  | "issue_credential"
  | "verify_credential"
  | "connect_starknet_wallet";

export type ToolInput =
  | ConnectBtcWalletInput
  | RequestSignatureInput
  | IssueCredentialInput
  | VerifyCredentialInput
  | ConnectStarknetWalletInput;

export type ToolOutput =
  | ConnectBtcWalletOutput
  | RequestSignatureOutput
  | IssueCredentialOutput
  | VerifyCredentialOutput
  | ConnectStarknetWalletOutput;

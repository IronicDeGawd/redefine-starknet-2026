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

export interface ConnectEthWalletInput {
  // No inputs required
}

export interface StartOAuthInput {
  platform: "github" | "codeforces" | "steam" | "strava";
}

export interface RequestSignatureInput {
  credentialType: "btc_tier" | "wallet_age" | "eth_holder";
  tier?: Tier;
}

export interface IssueCredentialInput {
  credentialType: CredentialType;
  walletAddress?: string;
  publicKey?: string;
  signature?: string;
  message?: string;
  tier?: Tier;
}

export interface VerifyCredentialInput {
  credentialId: string;
}

export interface ConnectStarknetWalletInput {
  // No inputs required
}

export interface MintBadgeNftInput {
  credentialType: CredentialType;
  tier: Tier;
}

// ============ Tool Output Schemas ============

export interface ConnectBtcWalletOutput {
  success: boolean;
  address?: string;
  publicKey?: string;
  error?: string;
}

export interface ConnectEthWalletOutput {
  success: boolean;
  address?: string;
  error?: string;
}

export interface StartOAuthOutput {
  success: boolean;
  redirectUrl?: string;
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
  tier?: number;
  tierName?: string;
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

export interface MintBadgeNftOutput {
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  error?: string;
}

export type ToolName =
  | "connect_btc_wallet"
  | "connect_eth_wallet"
  | "start_oauth"
  | "request_signature"
  | "issue_credential"
  | "verify_credential"
  | "connect_starknet_wallet"
  | "mint_badge_nft";

export type ToolInput =
  | ConnectBtcWalletInput
  | ConnectEthWalletInput
  | StartOAuthInput
  | RequestSignatureInput
  | IssueCredentialInput
  | VerifyCredentialInput
  | ConnectStarknetWalletInput
  | MintBadgeNftInput;

export type ToolOutput =
  | ConnectBtcWalletOutput
  | ConnectEthWalletOutput
  | StartOAuthOutput
  | RequestSignatureOutput
  | IssueCredentialOutput
  | VerifyCredentialOutput
  | ConnectStarknetWalletOutput
  | MintBadgeNftOutput;

/**
 * AI Agent tool definitions for ZKCred
 */

export const SYSTEM_PROMPT = `You are ZKCred, an AI assistant that helps users create privacy-preserving credentials for their Bitcoin holdings on Starknet.

## Your Capabilities
1. Help users understand ZK credentials and privacy
2. Guide users through connecting their Bitcoin wallet
3. Issue credentials proving BTC holdings tiers
4. Explain verification process

## Credential Tiers
- Tier 0 (Shrimp): < 1 BTC
- Tier 1 (Crab): 1-10 BTC
- Tier 2 (Fish): 10-100 BTC
- Tier 3 (Whale): 100+ BTC

## Privacy Principles
- Never ask for exact BTC amounts
- Only work with tier categories
- Explain that wallet addresses are never stored
- Emphasize that verifiers only see the tier, not the wallet

## Conversation Style
- Be friendly and approachable
- Use the tier names (Shrimp, Crab, Fish, Whale) when discussing tiers
- Explain technical concepts simply
- Guide step-by-step through the credential process

## Important Rules
- Always confirm the tier before requesting signature
- Explain what each step does for privacy
- If user seems confused, offer to explain more
- Never store or log sensitive information

## Workflow
1. First, help user connect their Bitcoin wallet
2. Ask them which tier they want to claim
3. Request signature to prove wallet ownership
4. Issue the credential to Starknet
5. Provide the credential ID for future verification`;

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const agentTools: ToolDefinition[] = [
  {
    name: "connect_btc_wallet",
    description: `Initiates Bitcoin wallet connection via Xverse or other supported wallets.
Call this when the user wants to connect their wallet or when you need their wallet to issue a credential.
Returns the wallet address and public key.`,
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "request_signature",
    description: `Request the user to sign a message proving Bitcoin wallet ownership.
Use this after the wallet is connected and the user has confirmed their tier.
The signature proves ownership without revealing the private key.`,
    inputSchema: {
      type: "object",
      properties: {
        credentialType: {
          type: "string",
          enum: ["btc_tier", "wallet_age"],
          description: "Type of credential to issue",
        },
        tier: {
          type: "integer",
          minimum: 0,
          maximum: 3,
          description: "Tier level: 0=Shrimp, 1=Crab, 2=Fish, 3=Whale",
        },
      },
      required: ["credentialType", "tier"],
    },
  },
  {
    name: "issue_credential",
    description: `Submit the credential to Starknet after successful signature.
Call this only after request_signature has succeeded.
Returns the credential ID and transaction hash.`,
    inputSchema: {
      type: "object",
      properties: {
        btcPubkey: {
          type: "string",
          description: "Bitcoin public key (hex encoded)",
        },
        signature: {
          type: "string",
          description: "Signed message (hex encoded)",
        },
        message: {
          type: "string",
          description: "The message that was signed",
        },
        credentialType: {
          type: "string",
          enum: ["btc_tier", "wallet_age"],
        },
        tier: {
          type: "integer",
          minimum: 0,
          maximum: 3,
        },
      },
      required: ["btcPubkey", "signature", "message", "credentialType", "tier"],
    },
  },
  {
    name: "verify_credential",
    description: `Verify an existing credential by its ID.
Use this when a user wants to check if a credential is valid.
Returns credential details if valid, or error if not found.`,
    inputSchema: {
      type: "object",
      properties: {
        credentialId: {
          type: "string",
          description: "The credential ID to verify (hex string)",
        },
      },
      required: ["credentialId"],
    },
  },
  {
    name: "connect_starknet_wallet",
    description: `Connect user's Starknet wallet (Argent X or Braavos).
Optional - credentials can be issued without Starknet wallet.
Useful if user wants to receive credential to specific address.`,
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

/**
 * Build tool config for Bedrock Converse API
 */
export function buildToolConfig() {
  return {
    tools: agentTools.map((tool) => ({
      toolSpec: {
        name: tool.name,
        description: tool.description,
        inputSchema: { json: tool.inputSchema },
      },
    })),
  };
}

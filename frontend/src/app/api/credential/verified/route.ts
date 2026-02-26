/**
 * /api/credential/verified - Issue oracle-verified credentials
 * Verifies actual BTC balance via oracle before issuing credential
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getCredentialRegistryWriter,
  getProvider,
  isRegistryConfigured,
  isServerAccountConfigured,
} from "@/lib/starknet";
import {
  hashPubkey,
  generateRandomSalt,
  stringToFelt,
  getErrorMessage,
  parseStarknetError,
  verifyBitcoinSignature,
} from "@/lib/utils";
import { verifyBalance, verifyWalletAge } from "@/lib/oracle";
import type { ApiError } from "@/types/api";

export const runtime = "nodejs";
export const maxDuration = 60;

interface VerifiedIssueRequest {
  btcAddress: string;
  btcPubkey: string;
  signature: string;
  message: string;
  credentialType: "btc_tier" | "wallet_age";
  network?: "mainnet" | "testnet";
}

interface VerifiedIssueResponse {
  success: boolean;
  credentialId?: string;
  transactionHash?: string;
  tier?: number;
  tierName?: string;
  verificationProof?: {
    oracleProvider: string;
    queryTimestamp: number;
    proofHash: string;
  };
  error?: string;
}

function validateRequest(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const req = body as Record<string, unknown>;

  if (!req.btcAddress || typeof req.btcAddress !== "string") {
    return { valid: false, error: "btcAddress is required" };
  }

  if (!req.btcPubkey || typeof req.btcPubkey !== "string") {
    return { valid: false, error: "btcPubkey is required" };
  }

  if (!req.signature || typeof req.signature !== "string") {
    return { valid: false, error: "signature is required" };
  }

  if (!req.message || typeof req.message !== "string") {
    return { valid: false, error: "message is required" };
  }

  if (!req.credentialType || !["btc_tier", "wallet_age"].includes(req.credentialType as string)) {
    return { valid: false, error: "credentialType must be 'btc_tier' or 'wallet_age'" };
  }

  return { valid: true };
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<VerifiedIssueResponse | ApiError>> {
  try {
    // 1. Check configuration
    if (!isServerAccountConfigured()) {
      return NextResponse.json(
        { success: false, error: "Server account not configured" },
        { status: 503 }
      );
    }

    if (!isRegistryConfigured()) {
      return NextResponse.json(
        { success: false, error: "Contract not deployed" },
        { status: 503 }
      );
    }

    // 2. Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // 3. Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const request = body as VerifiedIssueRequest;
    const network = request.network || "mainnet";

    // 4. Verify BIP-322 signature to prove wallet ownership
    const isValidSignature = verifyBitcoinSignature(
      request.message,
      request.signature,
      request.btcAddress
    );

    if (!isValidSignature) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid signature - cannot verify wallet ownership",
        },
        { status: 401 }
      );
    }

    // 5. Query oracle to verify actual balance/age
    let tier: number;
    let tierName: string;
    let proofHash: string;
    let oracleProvider: string;
    let queryTimestamp: number;

    if (request.credentialType === "btc_tier") {
      const verification = await verifyBalance({
        address: request.btcAddress,
        network,
      });

      if (!verification.success) {
        return NextResponse.json(
          {
            success: false,
            error: verification.error || "Failed to verify balance",
          },
          { status: 502 }
        );
      }

      tier = verification.tier;
      tierName = verification.tierName;
      proofHash = verification.verificationProof.balanceHash;
      oracleProvider = verification.verificationProof.oracleProvider;
      queryTimestamp = verification.verificationProof.queryTimestamp;
    } else {
      // wallet_age
      const verification = await verifyWalletAge(request.btcAddress, network);

      if (!verification.success) {
        return NextResponse.json(
          {
            success: false,
            error: verification.error || "Failed to verify wallet age",
          },
          { status: 502 }
        );
      }

      tier = verification.tier;
      tierName = verification.tierName;
      proofHash = verification.verificationProof.ageHash;
      oracleProvider = verification.verificationProof.oracleProvider;
      queryTimestamp = verification.verificationProof.queryTimestamp;
    }

    // 6. Hash the public key (privacy: don't store raw pubkey on-chain)
    const pubkeyHash = hashPubkey(request.btcPubkey);

    // 7. Generate random salt for credential ID
    const salt = generateRandomSalt();

    // 8. Convert credential type to felt
    const credentialTypeFelt = stringToFelt(request.credentialType);

    // 9. Get contract instance with server account
    const registry = getCredentialRegistryWriter();
    const provider = getProvider();

    // 10. Call contract to issue credential
    const tx = await registry.issue_credential(
      pubkeyHash,
      credentialTypeFelt,
      tier,
      salt
    );

    // 11. Wait for transaction confirmation
    const receipt = await provider.waitForTransaction(tx.transaction_hash);

    // 12. Extract credential ID from events
    let credentialId: string | undefined;

    const receiptWithEvents = receipt as { events?: Array<{ keys?: string[] }> };
    if (receiptWithEvents.events && receiptWithEvents.events.length > 0) {
      const issuedEvent = receiptWithEvents.events.find((event) =>
        event.keys?.some((key) => key.includes("CredentialIssued"))
      );

      if (issuedEvent && issuedEvent.keys && issuedEvent.keys.length > 1) {
        credentialId = issuedEvent.keys[1];
      }
    }

    if (!credentialId) {
      credentialId = `computed:${pubkeyHash.slice(0, 16)}`;
    }

    // 13. Return success with verification proof
    return NextResponse.json({
      success: true,
      credentialId,
      transactionHash: tx.transaction_hash,
      tier,
      tierName,
      verificationProof: {
        oracleProvider,
        queryTimestamp,
        proofHash,
      },
    });
  } catch (error) {
    console.error("[/api/credential/verified] Error:", error);

    const errorMessage = getErrorMessage(error);

    if (errorMessage.toLowerCase().includes("already issued")) {
      return NextResponse.json(
        {
          success: false,
          error: "A credential has already been issued for this wallet",
        },
        { status: 409 }
      );
    }

    if (errorMessage.toLowerCase().includes("rate limit")) {
      return NextResponse.json(
        {
          success: false,
          error: "Oracle rate limited. Please try again in a few minutes.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: parseStarknetError(error),
      },
      { status: 500 }
    );
  }
}

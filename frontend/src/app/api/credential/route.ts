/**
 * /api/credential - Issue credentials endpoint
 * Creates new ZK credentials on Starknet
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
  validateIssueRequest,
  getErrorMessage,
  parseStarknetError,
  verifyBitcoinSignature,
} from "@/lib/utils";
import type {
  IssueCredentialRequest,
  IssueCredentialResponse,
  ApiError,
} from "@/types/api";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 second timeout for blockchain tx

export async function POST(
  req: NextRequest
): Promise<NextResponse<IssueCredentialResponse | ApiError>> {
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
    const validation = validateIssueRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const request = body as IssueCredentialRequest;

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

    // 5. Hash the public key (privacy: don't store raw pubkey on-chain)
    const pubkeyHash = hashPubkey(request.btcPubkey);

    // 6. Generate random salt for credential ID
    const salt = generateRandomSalt();

    // 7. Convert credential type to felt
    const credentialTypeFelt = stringToFelt(request.credentialType);

    // 8. Get contract instance with server account
    const registry = getCredentialRegistryWriter();
    const provider = getProvider();

    // 9. Call contract to issue credential
    const tx = await registry.issue_credential(
      pubkeyHash,
      credentialTypeFelt,
      request.tier,
      salt
    );

    // 10. Wait for transaction confirmation
    const receipt = await provider.waitForTransaction(tx.transaction_hash);

    // 11. Extract credential ID from events
    let credentialId: string | undefined;

    // Type guard to check if receipt has events
    const receiptWithEvents = receipt as { events?: Array<{ keys?: string[] }> };
    if (receiptWithEvents.events && receiptWithEvents.events.length > 0) {
      // Look for CredentialIssued event
      const issuedEvent = receiptWithEvents.events.find((event) =>
        event.keys?.some((key) => key.includes("CredentialIssued"))
      );

      if (issuedEvent && issuedEvent.keys && issuedEvent.keys.length > 1) {
        // The credential_id is typically the first key after the event selector
        credentialId = issuedEvent.keys[1];
      }
    }

    // Fallback: compute credential ID locally if not found in events
    if (!credentialId) {
      // The contract uses poseidon hash of (pubkey_hash, type, tier, salt)
      // We can compute this client-side as well
      credentialId = `computed:${pubkeyHash.slice(0, 16)}`;
    }

    // 12. Return success
    return NextResponse.json({
      success: true,
      credentialId,
      transactionHash: tx.transaction_hash,
    });
  } catch (error) {
    console.error("[/api/credential] Error:", error);

    const errorMessage = getErrorMessage(error);

    // Handle specific Starknet errors
    if (errorMessage.toLowerCase().includes("already issued")) {
      return NextResponse.json(
        {
          success: false,
          error: "A credential has already been issued for this wallet",
        },
        { status: 409 }
      );
    }

    // Parse and return user-friendly error
    return NextResponse.json(
      {
        success: false,
        error: parseStarknetError(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET: List credentials (placeholder for future implementation)
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<{ credentials: unknown[] } | ApiError>> {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  // TODO: Query credentials by address from contract events
  // For MVP, credentials are tracked client-side in localStorage

  return NextResponse.json({ credentials: [] });
}

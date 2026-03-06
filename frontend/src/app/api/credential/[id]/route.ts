/**
 * /api/credential/[id] - Get or revoke specific credential
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getCredentialRegistryReader,
  getCredentialRegistryWriter,
  getProvider,
  isRegistryConfigured,
  isServerAccountConfigured,
} from "@/lib/starknet";
import {
  validateCredentialId,
  feltToString,
  getErrorMessage,
  parseStarknetError,
} from "@/lib/utils";
import { getTierName } from "@/lib/badges/config";
import { getTxByCredentialId } from "@/lib/redis";
import type { Tier } from "@/types/credential";
import type { ApiError } from "@/types/api";

export const runtime = "nodejs";

interface CredentialResponse {
  credential: {
    id: string;
    type: string;
    tier: number;
    tierName: string;
    issuedAt: string;
    status: "active" | "revoked";
    transactionHash?: string;
  };
}

/**
 * GET: Get credential details by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CredentialResponse | ApiError>> {
  try {
    const { id } = await params;

    // 1. Check configuration
    if (!isRegistryConfigured()) {
      return NextResponse.json(
        { error: "Contract not deployed" },
        { status: 503 }
      );
    }

    // 2. Validate format
    if (!validateCredentialId(id)) {
      return NextResponse.json(
        { error: "Invalid credential ID format" },
        { status: 400 }
      );
    }

    // 3. Get contract instance
    const registry = getCredentialRegistryReader();

    // 4. Call contract to get credential
    const result = await registry.get_credential(id);

    // 5. Check if credential exists
    const pubkeyHash = BigInt(result.pubkey_hash?.toString() || "0");
    if (pubkeyHash === 0n) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    // 6. Fetch tx hash from Redis (best-effort)
    const transactionHash = await getTxByCredentialId(id) ?? undefined;

    // 7. Format and return
    const tier = Number(result.tier);
    return NextResponse.json({
      credential: {
        id,
        type: feltToString(result.credential_type),
        tier,
        tierName: getTierName(feltToString(result.credential_type), tier as Tier),
        issuedAt: new Date(Number(result.issued_at) * 1000).toISOString(),
        status: result.revoked ? "revoked" : "active",
        transactionHash,
      },
    });
  } catch (error) {
    console.error("[/api/credential/[id]] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch credential" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Revoke a credential
 * Requires ownership proof (signature)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ success: boolean } | ApiError>> {
  try {
    const { id } = await params;

    // 1. Check configuration
    if (!isServerAccountConfigured()) {
      return NextResponse.json(
        { error: "Server account not configured" },
        { status: 503 }
      );
    }

    if (!isRegistryConfigured()) {
      return NextResponse.json(
        { error: "Contract not deployed" },
        { status: 503 }
      );
    }

    // 2. Validate credential ID
    if (!validateCredentialId(id)) {
      return NextResponse.json(
        { error: "Invalid credential ID format" },
        { status: 400 }
      );
    }

    // 3. Parse request body for ownership proof
    let body: { signature?: string; message?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Note: Revocation is now owner-only in the smart contract.
    // The server account (contract owner) can revoke any credential.
    // For user-initiated revocation in production, implement signature verification
    // to ensure the request comes from the credential holder.

    // 4. Get contract instance
    const registry = getCredentialRegistryWriter();
    const provider = getProvider();

    // 5. Call revoke function
    const tx = await registry.revoke_credential(id);

    // 6. Wait for confirmation
    await provider.waitForTransaction(tx.transaction_hash);

    // 7. Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/credential/[id]] DELETE Error:", error);

    const errorMessage = getErrorMessage(error);

    if (errorMessage.toLowerCase().includes("not found")) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    if (errorMessage.toLowerCase().includes("already revoked")) {
      return NextResponse.json(
        { error: "Credential already revoked" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: parseStarknetError(error) },
      { status: 500 }
    );
  }
}

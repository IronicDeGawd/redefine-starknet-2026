/**
 * /api/credential/lookup - Check if a credential already exists on-chain
 *
 * Used to recover "already issued" state when localStorage is cleared.
 * Calls the contract's is_issued(pubkey_hash, credential_type) view function.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getCredentialRegistryReader,
  isRegistryConfigured,
} from "@/lib/starknet";
import { hashPubkey, stringToFelt, isValidCredentialType } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    if (!isRegistryConfigured()) {
      return NextResponse.json(
        { exists: false, error: "Registry not configured" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { identifier, credentialType } = body;

    if (!identifier || !credentialType) {
      return NextResponse.json(
        { exists: false, error: "identifier and credentialType required" },
        { status: 400 }
      );
    }

    if (!isValidCredentialType(credentialType)) {
      return NextResponse.json(
        { exists: false, error: "Invalid credentialType" },
        { status: 400 }
      );
    }

    const pubkeyHash = hashPubkey(identifier);
    const credTypeFelt = stringToFelt(credentialType);

    const registry = getCredentialRegistryReader();
    const issued = await registry.is_issued(pubkeyHash, credTypeFelt);

    return NextResponse.json({ exists: Boolean(issued) });
  } catch (error) {
    console.error("[/api/credential/lookup] Error:", error);
    return NextResponse.json(
      { exists: false, error: "Lookup failed" },
      { status: 500 }
    );
  }
}

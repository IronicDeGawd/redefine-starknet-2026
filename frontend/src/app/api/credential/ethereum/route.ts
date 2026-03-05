/**
 * /api/credential/ethereum - Issue ETH holder tier credentials
 * Queries ETH balance via public RPC endpoints
 *
 * Requires EIP-191 personal_sign signature to prove wallet ownership.
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
  generateCredentialId,
  extractCredentialIdFromReceipt,
  stringToFelt,
  getErrorMessage,
  parseStarknetError,
  isDuplicateError,
  hashToFelt,
} from "@/lib/utils";
import { cacheCredential } from "@/lib/redis";
import { verifyEthBalance } from "@/lib/connectors/ethereum";
import { createCommitment } from "@/lib/crypto/commitment";
import { verifyEthSignature, isTimestampValid } from "@/lib/utils/ethereum-sig";
import type { ApiError } from "@/types/api";

export const runtime = "nodejs";
export const maxDuration = 60;

interface EthCredentialRequest {
  ethAddress: string;
  signature: string;
  message: string;
  network?: "mainnet" | "sepolia";
}

interface EthCredentialResponse {
  success: boolean;
  credentialId?: string;
  transactionHash?: string;
  tier?: number;
  tierName?: string;
  balanceEth?: number;
  verificationProof?: {
    oracleProvider: string;
    queryTimestamp: number;
    proofHash: string;
  };
  commitment?: string;
  error?: string;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<EthCredentialResponse | ApiError>> {
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

    // 2. Parse request
    let body: EthCredentialRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body.ethAddress || typeof body.ethAddress !== "string") {
      return NextResponse.json(
        { success: false, error: "ethAddress is required" },
        { status: 400 }
      );
    }

    // 3. Validate ETH address format
    if (!/^0x[0-9a-fA-F]{40}$/.test(body.ethAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid Ethereum address format" },
        { status: 400 }
      );
    }

    // 3.5 Verify wallet ownership via EIP-191 signature
    if (!body.signature || !body.message) {
      return NextResponse.json(
        { success: false, error: "signature and message are required to prove wallet ownership" },
        { status: 400 }
      );
    }

    if (!isTimestampValid(body.message)) {
      return NextResponse.json(
        { success: false, error: "Challenge message expired (>5 min). Please sign again." },
        { status: 401 }
      );
    }

    if (!verifyEthSignature(body.message, body.signature, body.ethAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid signature — wallet ownership not proven" },
        { status: 401 }
      );
    }

    const network = body.network || "mainnet";

    // [3.1 + 4.2] Validate network enum — don't silently fall back
    if (network !== "mainnet" && network !== "sepolia") {
      return NextResponse.json(
        { success: false, error: "network must be 'mainnet' or 'sepolia'" },
        { status: 400 }
      );
    }

    // 4. Verify ETH balance via public RPC
    const verification = await verifyEthBalance(body.ethAddress, network);

    if (!verification.success) {
      return NextResponse.json(
        { success: false, error: verification.error || "Failed to verify ETH balance" },
        { status: 502 }
      );
    }

    // 5. Hash the ETH address (privacy: don't store raw address on-chain)
    const pubkeyHash = hashPubkey(body.ethAddress);

    // 6. Generate random salt
    const salt = generateRandomSalt();

    // 7. Convert credential type to felt
    const credentialTypeFelt = stringToFelt("eth_holder");

    // 8. Create Poseidon commitment
    const verificationHashFelt = hashToFelt(verification.verificationProof.dataHash);
    const commitment = createCommitment(
      pubkeyHash,
      credentialTypeFelt,
      verification.tier,
      verificationHashFelt,
      salt
    );

    // 9. Get contract and issue credential
    const registry = getCredentialRegistryWriter();
    const provider = getProvider();
    const oracleProviderFelt = stringToFelt("ethereum_rpc");

    const tx = await registry.issue_credential(
      pubkeyHash,
      credentialTypeFelt,
      verification.tier,
      salt,
      verificationHashFelt,
      oracleProviderFelt,
      commitment
    );

    // 10. Wait for confirmation and extract credential ID
    const receipt = await provider.waitForTransaction(tx.transaction_hash);

    let credentialId = extractCredentialIdFromReceipt(receipt);
    if (!credentialId) {
      credentialId = generateCredentialId(pubkeyHash, "eth_holder", verification.tier, salt);
    }

    cacheCredential(pubkeyHash, "eth_holder", {
      credentialId, tier: verification.tier, tierName: verification.tierName,
      transactionHash: tx.transaction_hash,
    });

    // 11. Return success
    return NextResponse.json({
      success: true,
      credentialId,
      transactionHash: tx.transaction_hash,
      tier: verification.tier,
      tierName: verification.tierName,
      balanceEth: verification.profile?.balanceEth,
      verificationProof: {
        oracleProvider: "ethereum_rpc",
        queryTimestamp: verification.verificationProof.queryTimestamp,
        proofHash: verification.verificationProof.dataHash,
      },
      commitment,
    });
  } catch (error) {
    console.error("[/api/credential/ethereum] Error:", error);
    const errorMessage = getErrorMessage(error);

    if (isDuplicateError(error)) {
      return NextResponse.json(
        { success: false, error: "An ETH credential has already been issued for this address" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: parseStarknetError(error) },
      { status: 500 }
    );
  }
}

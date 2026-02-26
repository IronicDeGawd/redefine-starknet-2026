"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useBtcWallet } from "@/hooks/useBtcWallet";
import { useCredential } from "@/hooks/useCredential";
import { TierBadge, TierIcon } from "@/components/credential/TierBadge";
import type { ToolUse } from "@/types/api";
import type { Tier, CredentialType } from "@/types/credential";
import { Wallet, PenTool, Send, CheckCircle2, AlertCircle, Bitcoin } from "lucide-react";
import { TIER_NAMES, TIER_RANGES } from "@/types/credential";

interface ToolActionProps {
  toolUse: ToolUse;
  onAction: (action: string, data?: unknown) => void;
}

export function ToolAction({ toolUse, onAction }: ToolActionProps) {
  const { name, input } = toolUse;

  switch (name) {
    case "connect_btc_wallet":
      return <ConnectWalletAction onAction={onAction} />;

    case "sign_credential_request":
      return (
        <SignRequestAction
          credentialType={input.credential_type as CredentialType}
          tier={input.tier as Tier}
          onAction={onAction}
        />
      );

    case "issue_credential":
      return (
        <IssueCredentialAction
          input={input as unknown as IssueCredentialInput}
          onAction={onAction}
        />
      );

    default:
      return (
        <div className="p-4 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
          <p className="text-sm text-[var(--text-muted)]">
            Processing: {name}
          </p>
        </div>
      );
  }
}

// ============================================
// Connect Wallet Action
// ============================================

function ConnectWalletAction({ onAction }: { onAction: (action: string, data?: unknown) => void }) {
  const { connect, isConnecting, isConnected, address } = useBtcWallet();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    try {
      const result = await connect();
      onAction("connected", result);
    } catch {
      setError("Failed to connect wallet. Please try again.");
    }
  };

  if (isConnected && address) {
    return (
      <div className="p-4 bg-white rounded-2xl border border-[var(--success)]/30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--success-light)] flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-[var(--success)]" />
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">Wallet Connected</p>
            <p className="text-sm text-[var(--text-muted)] font-mono">
              {address.slice(0, 10)}...{address.slice(-6)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
          <Bitcoin className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">Connect Bitcoin Wallet</p>
          <p className="text-sm text-[var(--text-muted)]">
            Connect via Xverse to prove wallet ownership
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-[var(--error-light)] rounded-xl text-sm text-[var(--error)]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button
        onClick={handleConnect}
        isLoading={isConnecting}
        className="w-full"
      >
        <Wallet className="w-4 h-4" />
        Connect with Xverse
      </Button>
    </div>
  );
}

// ============================================
// Sign Request Action
// ============================================

interface SignRequestActionProps {
  credentialType: CredentialType;
  tier: Tier;
  onAction: (action: string, data?: unknown) => void;
}

function SignRequestAction({ credentialType, tier, onAction }: SignRequestActionProps) {
  const { signMessage, pubkey, address } = useBtcWallet();
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const message = `ZKCred Credential Request\nType: ${credentialType}\nTier: ${tier} (${TIER_NAMES[tier]})\nTimestamp: ${Date.now()}`;

  const handleSign = async () => {
    setError(null);
    setIsSigning(true);

    try {
      const signature = await signMessage(message);
      onAction("signed", { signature, message, pubkey, address });
    } catch {
      setError("Signing failed. Please try again.");
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="p-5 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl bg-[var(--primary-light)] flex items-center justify-center">
          <PenTool className="w-6 h-6 text-[var(--primary)]" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">Sign Message</p>
          <p className="text-sm text-[var(--text-muted)]">
            Verify wallet ownership (no BTC will be spent)
          </p>
        </div>
      </div>

      {/* Message preview */}
      <div className="mb-4 p-4 bg-[var(--grey-100)] rounded-xl">
        <p className="text-xs text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wider">
          Message to sign
        </p>
        <pre className="text-sm text-[var(--text-secondary)] font-mono whitespace-pre-wrap">
          {message}
        </pre>
      </div>

      {/* Tier badge */}
      <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-[var(--grey-100)] rounded-xl">
        <TierIcon tier={tier} size="md" />
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {TIER_NAMES[tier]} Tier
          </p>
          <p className="text-xs text-[var(--text-muted)]">{TIER_RANGES[tier]}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-[var(--error-light)] rounded-xl text-sm text-[var(--error)]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button
        onClick={handleSign}
        isLoading={isSigning}
        className="w-full"
      >
        <PenTool className="w-4 h-4" />
        Sign with Xverse
      </Button>
    </div>
  );
}

// ============================================
// Issue Credential Action
// ============================================

interface IssueCredentialInput {
  signature: string;
  pubkey: string;
  address: string;
  message: string;
  credential_type: CredentialType;
  tier: Tier;
}

interface IssueCredentialActionProps {
  input: IssueCredentialInput;
  onAction: (action: string, data?: unknown) => void;
}

function IssueCredentialAction({ input, onAction }: IssueCredentialActionProps) {
  const { issueCredential, isIssuing } = useCredential();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "issuing" | "success">("idle");

  const handleIssue = async () => {
    setError(null);
    setStatus("issuing");

    try {
      const result = await issueCredential({
        btcPubkey: input.pubkey,
        btcAddress: input.address,
        signature: input.signature,
        message: input.message,
        credentialType: input.credential_type,
        tier: input.tier,
      });

      if (result.success) {
        setStatus("success");
        onAction("issued", {
          credentialId: result.credentialId,
          transactionHash: result.transactionHash,
          tier: input.tier,
          type: input.credential_type,
        });
      } else {
        setError(result.error || "Failed to issue credential");
        setStatus("idle");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  };

  if (status === "success") {
    return (
      <div className="p-5 bg-white rounded-2xl border border-[var(--success)]/30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--success-light)] flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-[var(--success)]" />
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">Success!</p>
            <p className="text-sm text-[var(--text-muted)]">
              Your credential has been issued on Starknet
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl bg-[var(--primary-light)] flex items-center justify-center">
          <Send className="w-6 h-6 text-[var(--primary)]" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">Issue Credential</p>
          <p className="text-sm text-[var(--text-muted)]">
            Submit to Starknet blockchain
          </p>
        </div>
      </div>

      {/* Progress steps */}
      {status === "issuing" && (
        <div className="mb-5 p-4 bg-[var(--grey-100)] rounded-xl space-y-3">
          <ProgressStep label="Verifying signature" status="complete" />
          <ProgressStep label="Creating commitment" status="active" />
          <ProgressStep label="Submitting transaction" status="pending" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-[var(--error-light)] rounded-xl text-sm text-[var(--error)]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button
        onClick={handleIssue}
        isLoading={isIssuing || status === "issuing"}
        className="w-full"
        variant="success"
      >
        <Send className="w-4 h-4" />
        Issue on Starknet
      </Button>
    </div>
  );
}

function ProgressStep({
  label,
  status,
}: {
  label: string;
  status: "pending" | "active" | "complete";
}) {
  return (
    <div className="flex items-center gap-3">
      {status === "complete" && (
        <div className="w-5 h-5 rounded-full bg-[var(--success)] flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      {status === "active" && (
        <div className="w-5 h-5 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
      )}
      {status === "pending" && (
        <div className="w-5 h-5 rounded-full border-2 border-[var(--grey-300)]" />
      )}
      <span
        className={`text-sm ${
          status === "pending" ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

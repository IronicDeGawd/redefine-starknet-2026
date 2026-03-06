"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useBtcWallet } from "@/hooks/useBtcWallet";
import { useEthWallet } from "@/hooks/useEthWallet";
import { useCredential } from "@/hooks/useCredential";
import { useAppStore } from "@/stores/useAppStore";
import { TierIcon } from "@/components/credential/TierBadge";
import { CREDENTIAL_CONFIG } from "@/lib/badges/config";
import type { ToolUse } from "@/types/api";
import type { Tier, CredentialType } from "@/types/credential";
import { Wallet, PenTool, Send, CheckCircle2, AlertCircle, Bitcoin, Github, Code2, Gamepad2, Activity, Search, Sparkles, LinkIcon, ExternalLink, Eye, Trash2 } from "lucide-react";
import { getOpenIDUrl } from "@/lib/connectors/steam";
import { TIER_NAMES, TIER_RANGES } from "@/types/credential";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface ToolActionProps {
  toolUse: ToolUse;
  onAction: (action: string, data?: unknown) => void;
}

export function ToolAction({ toolUse, onAction }: ToolActionProps) {
  const { name, input } = toolUse;

  switch (name) {
    case "connect_btc_wallet":
      return <ConnectWalletAction onAction={onAction} />;

    case "connect_eth_wallet":
      return <ConnectEthWalletAction onAction={onAction} />;

    case "request_signature":
    case "sign_credential_request":
      return (
        <SignRequestAction
          credentialType={(input.credentialType ?? input.credential_type) as CredentialType}
          tier={input.tier as Tier}
          onAction={onAction}
        />
      );

    case "start_oauth":
      return (
        <StartOAuthAction
          platform={input.platform as string}
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

    case "verify_credential":
      return (
        <VerifyCredentialAction
          credentialId={input.credentialId as string}
          onAction={onAction}
        />
      );

    case "connect_starknet_wallet":
      return <ConnectStarknetAction onAction={onAction} />;

    case "mint_badge_nft":
      return (
        <MintBadgeAction
          credentialType={input.credentialType as CredentialType}
          tier={input.tier as Tier}
          onAction={onAction}
        />
      );

    case "check_auth_status":
      return <CheckAuthStatusAction onAction={onAction} />;

    case "lookup_credential_by_type":
      return (
        <LookupCredentialAction
          credentialType={input.credentialType as CredentialType}
          onAction={onAction}
        />
      );

    case "revoke_credential":
      return (
        <RevokeCredentialAction
          credentialId={input.credentialId as string}
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
  const btcWallet = useBtcWallet();
  const ethWallet = useEthWallet();
  const isEth = credentialType === "eth_holder";
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const message = `ZKCred Credential Request\nType: ${credentialType}\nTier: ${tier} (${TIER_NAMES[tier]})\nTimestamp: ${Date.now()}`;

  const handleSign = async () => {
    setError(null);
    setIsSigning(true);

    try {
      if (isEth) {
        const signature = await ethWallet.signMessage(message);
        onAction("signed", { signature, message, address: ethWallet.address });
      } else {
        const signature = await btcWallet.signMessage(message);
        onAction("signed", { signature, message, pubkey: btcWallet.pubkey, address: btcWallet.address });
      }
    } catch {
      setError("Signing failed. Please try again.");
    } finally {
      setIsSigning(false);
    }
  };

  const walletLabel = isEth ? "MetaMask" : "Xverse";
  const currencyLabel = isEth ? "ETH" : "BTC";

  return (
    <div className="p-5 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl bg-[var(--primary-light)] flex items-center justify-center">
          <PenTool className="w-6 h-6 text-[var(--primary)]" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">Sign Message</p>
          <p className="text-sm text-[var(--text-muted)]">
            Verify wallet ownership (no {currencyLabel} will be spent)
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
        Sign with {walletLabel}
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
  credentialType?: CredentialType;
  tier: Tier;
}

interface IssueCredentialActionProps {
  input: IssueCredentialInput;
  onAction: (action: string, data?: unknown) => void;
}

const OAUTH_CREDENTIAL_ENDPOINTS: Record<string, string> = {
  github_dev: "/api/credential/github",
  codeforces_coder: "/api/credential/codeforces",
  steam_gamer: "/api/credential/steam",
  strava_athlete: "/api/credential/strava",
};

function IssueCredentialAction({ input, onAction }: IssueCredentialActionProps) {
  const { issueCredential, isIssuing } = useCredential();
  const addCredential = useAppStore((s) => s.addCredential);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "issuing" | "success">("idle");

  const credType = input.credential_type || input.credentialType;
  const isOAuth = credType ? credType in OAUTH_CREDENTIAL_ENDPOINTS : false;

  const handleIssue = async () => {
    setError(null);
    setStatus("issuing");

    try {
      if (isOAuth && credType) {
        const endpoint = OAUTH_CREDENTIAL_ENDPOINTS[credType];
        const res = await fetch(`${BASE_PATH}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();

        if (data.success) {
          addCredential({
            id: data.credentialId,
            pubkeyHash: "",
            credentialType: credType,
            tier: data.tier as Tier,
            issuedAt: new Date().toISOString(),
            revoked: false,
            transactionHash: data.transactionHash,
          });
          setStatus("success");
          onAction("issued", {
            credentialId: data.credentialId,
            transactionHash: data.transactionHash,
            tier: data.tier,
            type: credType,
          });
        } else {
          const errMsg = data.error || "Failed to issue credential";
          setError(errMsg);
          setStatus("idle");
          onAction("error", { error: errMsg, credentialType: credType });
        }
      } else {
        const result = await issueCredential({
          btcPubkey: input.pubkey,
          btcAddress: input.address,
          signature: input.signature,
          message: input.message,
          credentialType: credType!,
          tier: input.tier,
        });

        if (result.success) {
          setStatus("success");
          onAction("issued", {
            credentialId: result.credentialId,
            transactionHash: result.transactionHash,
            tier: input.tier,
            type: credType,
          });
        } else {
          const errMsg = result.error || "Failed to issue credential";
          setError(errMsg);
          setStatus("idle");
          onAction("error", { error: errMsg, credentialType: credType });
        }
      }
    } catch {
      const errMsg = "Something went wrong. Please try again.";
      setError(errMsg);
      setStatus("idle");
      onAction("error", { error: errMsg, credentialType: credType });
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

// ============================================
// Connect ETH Wallet Action
// ============================================

function ConnectEthWalletAction({ onAction }: { onAction: (action: string, data?: unknown) => void }) {
  const { connect, isConnecting, isConnected, address } = useEthWallet();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    try {
      const result = await connect();
      onAction("connected", result);
    } catch {
      setError("Failed to connect MetaMask. Is it installed?");
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
              {address.slice(0, 8)}...{address.slice(-6)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">Connect Ethereum Wallet</p>
          <p className="text-sm text-[var(--text-muted)]">
            Connect via MetaMask to prove wallet ownership
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-[var(--error-light)] rounded-xl text-sm text-[var(--error)]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button onClick={handleConnect} isLoading={isConnecting} className="w-full">
        <Wallet className="w-4 h-4" />
        Connect with MetaMask
      </Button>
    </div>
  );
}

// ============================================
// Start OAuth Action
// ============================================

const OAUTH_CONFIG: Record<string, { label: string; icon: typeof Github; color: string; bgColor: string }> = {
  github:     { label: "GitHub",     icon: Github,   color: "text-violet-600", bgColor: "bg-violet-100" },
  codeforces: { label: "Codeforces", icon: Code2,    color: "text-blue-600",   bgColor: "bg-blue-100" },
  steam:      { label: "Steam",      icon: Gamepad2, color: "text-gray-600",   bgColor: "bg-gray-100" },
  strava:     { label: "Strava",     icon: Activity, color: "text-orange-600", bgColor: "bg-orange-100" },
};

function StartOAuthAction({
  platform,
  onAction,
}: {
  platform: string;
  onAction: (action: string, data?: unknown) => void;
}) {
  const config = OAUTH_CONFIG[platform];
  const Icon = config?.icon ?? LinkIcon;
  const label = config?.label ?? platform;

  const handleAuth = () => {
    const origin = window.location.origin;
    const rand = Math.random().toString(36).slice(2);
    // Encode "from=chat" in state so callbacks redirect back to /chat
    const chatState = `${rand}:chat`;

    if (platform === "github") {
      const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
      if (!clientId) { onAction("error", { message: "GitHub OAuth not configured" }); return; }
      document.cookie = `gh_oauth_state=${chatState};path=/;max-age=300;samesite=lax`;
      const redirectUri = `${origin}${BASE_PATH}/api/auth/github/callback`;
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user&state=${encodeURIComponent(chatState)}`;
    } else if (platform === "codeforces") {
      const clientId = process.env.NEXT_PUBLIC_CODEFORCES_CLIENT_ID;
      if (!clientId) { onAction("error", { message: "Codeforces OIDC not configured" }); return; }
      document.cookie = `cf_oauth_state=${chatState};path=/;max-age=300;samesite=lax`;
      const redirectUri = `${origin}${BASE_PATH}/api/auth/codeforces/callback`;
      window.location.href = `https://codeforces.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid&state=${encodeURIComponent(chatState)}`;
    } else if (platform === "steam") {
      // Steam OpenID doesn't use state; embed from=chat in the return URL
      const returnUrl = `${origin}${BASE_PATH}/api/auth/steam/callback?from=chat`;
      window.location.href = getOpenIDUrl(returnUrl);
    } else if (platform === "strava") {
      const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
      if (!clientId) { onAction("error", { message: "Strava OAuth not configured" }); return; }
      document.cookie = `strava_oauth_state=${chatState};path=/;max-age=300;samesite=lax`;
      const redirectUri = `${origin}${BASE_PATH}/api/auth/strava/callback`;
      window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=activity:read_all&state=${encodeURIComponent(chatState)}`;
    } else {
      onAction("error", { message: `Unknown OAuth platform: ${platform}` });
    }
  };

  return (
    <div className="p-5 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className={`w-12 h-12 rounded-xl ${config?.bgColor ?? "bg-gray-100"} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${config?.color ?? "text-gray-600"}`} />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">Authenticate with {label}</p>
          <p className="text-sm text-[var(--text-muted)]">
            You&apos;ll be redirected to log in and verify your account
          </p>
        </div>
      </div>

      <Button onClick={handleAuth} className="w-full">
        <ExternalLink className="w-4 h-4" />
        Connect {label}
      </Button>
    </div>
  );
}

// ============================================
// Verify Credential Action
// ============================================

function VerifyCredentialAction({
  credentialId,
  onAction,
}: {
  credentialId: string;
  onAction: (action: string, data?: unknown) => void;
}) {
  const [status, setStatus] = useState<"idle" | "verifying" | "done">("idle");
  const [result, setResult] = useState<{ valid: boolean; credential?: Record<string, unknown> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setStatus("verifying");
    setError(null);
    try {
      const res = await fetch(
        `${BASE_PATH}/api/verify?id=${encodeURIComponent(credentialId)}`
      );
      const data = await res.json();
      setResult(data);
      setStatus("done");
      onAction("verified", data);
    } catch {
      setError("Verification failed. Please try again.");
      setStatus("idle");
    }
  };

  if (status === "done" && result) {
    return (
      <div className={`p-5 bg-white rounded-2xl border shadow-sm ${result.valid ? "border-[var(--success)]/30" : "border-[var(--error)]/30"}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${result.valid ? "bg-[var(--success-light)]" : "bg-[var(--error-light)]"}`}>
            {result.valid ? (
              <CheckCircle2 className="w-6 h-6 text-[var(--success)]" />
            ) : (
              <AlertCircle className="w-6 h-6 text-[var(--error)]" />
            )}
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">
              {result.valid ? "Credential Valid" : "Credential Invalid"}
            </p>
            <p className="text-sm text-[var(--text-muted)] font-mono">
              {credentialId.slice(0, 10)}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Search className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">Verify Credential</p>
          <p className="text-sm text-[var(--text-muted)] font-mono">
            {credentialId.slice(0, 14)}...
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-[var(--error-light)] rounded-xl text-sm text-[var(--error)]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button onClick={handleVerify} isLoading={status === "verifying"} className="w-full">
        <Search className="w-4 h-4" />
        Verify on Starknet
      </Button>
    </div>
  );
}

// ============================================
// Connect Starknet Wallet Action
// ============================================

function ConnectStarknetAction({ onAction }: { onAction: (action: string, data?: unknown) => void }) {
  const [error, setError] = useState<string | null>(null);

  const handleConnect = () => {
    setError(null);
    // For hackathon: placeholder — real implementation would use get-starknet
    onAction("connected", { address: null, message: "Starknet wallet integration coming soon" });
  };

  return (
    <div className="p-5 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
          <LinkIcon className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">Connect Starknet Wallet</p>
          <p className="text-sm text-[var(--text-muted)]">
            Connect Argent X or Braavos to mint badge NFTs
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-[var(--error-light)] rounded-xl text-sm text-[var(--error)]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button onClick={handleConnect} className="w-full">
        <LinkIcon className="w-4 h-4" />
        Connect Starknet Wallet
      </Button>
    </div>
  );
}

// ============================================
// Mint Badge NFT Action
// ============================================

function MintBadgeAction({
  credentialType,
  tier,
  onAction,
}: {
  credentialType: CredentialType;
  tier: Tier;
  onAction: (action: string, data?: unknown) => void;
}) {
  const [status, setStatus] = useState<"idle" | "minting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleMint = async () => {
    setStatus("minting");
    setError(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/nft/mint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialType, tier }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        onAction("minted", data);
      } else {
        setError(data.error || "Minting failed");
        setStatus("idle");
      }
    } catch {
      setError("Minting failed. Please try again.");
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
            <p className="font-semibold text-[var(--text-primary)]">Badge Minted!</p>
            <p className="text-sm text-[var(--text-muted)]">
              Your soulbound badge NFT has been minted on Starknet
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">Mint Badge NFT</p>
          <p className="text-sm text-[var(--text-muted)]">
            Mint a soulbound badge for your {TIER_NAMES[tier]} tier
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-[var(--grey-100)] rounded-xl">
        <TierIcon tier={tier} size="md" />
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{TIER_NAMES[tier]} Tier</p>
          <p className="text-xs text-[var(--text-muted)]">{TIER_RANGES[tier]}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-[var(--error-light)] rounded-xl text-sm text-[var(--error)]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button onClick={handleMint} isLoading={status === "minting"} className="w-full">
        <Sparkles className="w-4 h-4" />
        Mint Badge NFT
      </Button>
    </div>
  );
}

// ============================================
// Check Auth Status Action (auto-executes)
// ============================================

function CheckAuthStatusAction({ onAction }: { onAction: (action: string, data?: unknown) => void }) {
  const btcWallet = useAppStore((s) => s.btcWallet);
  const ethWallet = useAppStore((s) => s.ethWallet);
  const credentials = useAppStore((s) => s.credentials);

  useEffect(() => {
    const status = {
      btcWallet: btcWallet.status === "connected"
        ? { connected: true, address: btcWallet.address }
        : { connected: false },
      ethWallet: ethWallet.status === "connected"
        ? { connected: true, address: ethWallet.address }
        : { connected: false },
      credentials: credentials.map((c) => ({
        id: c.id,
        type: c.credentialType,
        tier: c.tier,
        active: !c.revoked,
      })),
    };
    onAction("status_checked", status);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-4 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Eye className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)] text-sm">Checking your status...</p>
          <p className="text-xs text-[var(--text-muted)]">
            {credentials.length} credential{credentials.length !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Lookup Credential by Type Action (auto-executes)
// ============================================

function LookupCredentialAction({
  credentialType,
  onAction,
}: {
  credentialType: CredentialType;
  onAction: (action: string, data?: unknown) => void;
}) {
  const credentials = useAppStore((s) => s.credentials);
  const config = CREDENTIAL_CONFIG[credentialType];

  useEffect(() => {
    const found = credentials.find((c) => c.credentialType === credentialType && !c.revoked);
    if (found) {
      onAction("credential_found", {
        id: found.id,
        type: found.credentialType,
        tier: found.tier,
        tierName: config?.tiers[found.tier]?.name ?? `Tier ${found.tier}`,
        issuedAt: found.issuedAt,
      });
    } else {
      onAction("credential_not_found", { type: credentialType });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const found = credentials.find((c) => c.credentialType === credentialType && !c.revoked);

  return (
    <div className={`p-4 bg-white rounded-2xl border shadow-sm ${found ? "border-[var(--success)]/30" : "border-[var(--border)]"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${found ? "bg-[var(--success-light)]" : "bg-[var(--grey-100)]"}`}>
          {found ? (
            <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
          ) : (
            <Search className="w-5 h-5 text-[var(--text-muted)]" />
          )}
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)] text-sm">
            {config?.label ?? credentialType}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {found
              ? `${config?.tiers[found.tier]?.name ?? "Tier " + found.tier} — Active`
              : "No credential found"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Revoke Credential Action
// ============================================

function RevokeCredentialAction({
  credentialId,
  onAction,
}: {
  credentialId: string;
  onAction: (action: string, data?: unknown) => void;
}) {
  const removeCredential = useAppStore((s) => s.removeCredential);
  const credentials = useAppStore((s) => s.credentials);
  const [status, setStatus] = useState<"confirm" | "done">("confirm");
  const cred = credentials.find((c) => c.id === credentialId);

  const handleRevoke = () => {
    removeCredential(credentialId);
    setStatus("done");
    onAction("revoked", { credentialId });
  };

  if (!cred) {
    return (
      <div className="p-4 bg-white rounded-2xl border border-[var(--error)]/30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--error-light)] flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-[var(--error)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">Credential not found locally</p>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="p-4 bg-white rounded-2xl border border-[var(--success)]/30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--success-light)] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Credential revoked</p>
        </div>
      </div>
    );
  }

  const config = CREDENTIAL_CONFIG[cred.credentialType as CredentialType];

  return (
    <div className="p-5 bg-white rounded-2xl border border-[var(--error)]/20 shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">Revoke Credential</p>
          <p className="text-sm text-[var(--text-muted)]">
            {config?.label ?? cred.credentialType} — {config?.tiers[cred.tier]?.name ?? `Tier ${cred.tier}`}
          </p>
        </div>
      </div>

      <div className="mb-4 p-3 bg-red-50 rounded-xl text-sm text-red-700">
        This will remove the credential from your local storage. On-chain data remains unchanged.
      </div>

      <Button onClick={handleRevoke} className="w-full bg-red-600 hover:bg-red-700 text-white">
        <Trash2 className="w-4 h-4" />
        Confirm Revoke
      </Button>
    </div>
  );
}

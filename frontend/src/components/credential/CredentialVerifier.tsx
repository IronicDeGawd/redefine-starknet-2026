"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useCredential } from "@/hooks/useCredential";
import type { VerifyCredentialResponse } from "@/types/api";
import type { Tier, CredentialType } from "@/types/credential";
import { CREDENTIAL_TIER_NAMES, CREDENTIAL_TIER_RANGES } from "@/types/credential";
import { CREDENTIAL_CONFIG } from "@/lib/badges/config";
import { Search, Shield, CheckCircle, XCircle, ExternalLink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface CredentialVerifierProps {
  initialId?: string;
}

const CREDENTIAL_LABELS: Record<string, string> = {
  btc_tier: "BTC Holdings",
  wallet_age: "Wallet Age",
  eth_holder: "ETH Holdings",
  github_dev: "GitHub Developer",
  codeforces_coder: "Codeforces Coder",
  steam_gamer: "Steam Gamer",
  strava_athlete: "Strava Athlete",
};

function getProofTexts(type: string, tier: Tier): string[] {
  const ranges = CREDENTIAL_TIER_RANGES[type as CredentialType];
  const range = ranges?.[tier] || "";
  switch (type) {
    case "btc_tier":
      return ["Holder controls a Bitcoin wallet", `Holdings verified in ${range} range`, "Credential verified on Starknet blockchain"];
    case "wallet_age":
      return ["Holder controls a Bitcoin wallet", `Wallet age verified: ${range}`, "Credential verified on Starknet blockchain"];
    case "eth_holder":
      return ["Holder controls an Ethereum wallet", `Balance verified in ${range} range`, "Credential verified on Starknet blockchain"];
    case "github_dev":
      return ["Holder owns a GitHub account", `Public repositories: ${range}`, "Credential verified on Starknet blockchain"];
    case "codeforces_coder":
      return ["Holder has a Codeforces profile", `Rating verified: ${range}`, "Credential verified on Starknet blockchain"];
    case "steam_gamer":
      return ["Holder owns a Steam account", `Game library: ${range}`, "Credential verified on Starknet blockchain"];
    case "strava_athlete":
      return ["Holder has a Strava profile", `Total distance: ${range}`, "Credential verified on Starknet blockchain"];
    default:
      return ["Identity verified", "Credential verified on Starknet blockchain"];
  }
}

const tierCardBg: Record<Tier, string> = {
  0: "from-[var(--tier-shrimp-bg)] to-white",
  1: "from-[var(--tier-crab-bg)] to-white",
  2: "from-[var(--tier-fish-bg)] to-white",
  3: "from-[var(--tier-whale-bg)] to-white",
};

export function CredentialVerifier({ initialId }: CredentialVerifierProps) {
  const [inputId, setInputId] = useState(initialId || "");
  const [result, setResult] = useState<VerifyCredentialResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { verifyCredential, isVerifying } = useCredential();

  const handleVerify = async () => {
    if (!inputId.trim()) return;

    setHasSearched(true);
    const response = await verifyCredential(inputId.trim());
    setResult(response);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center">
            <Search className="w-5 h-5 text-[var(--accent-primary)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] font-[var(--font-display)]">
              Verify a Credential
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Enter a credential ID to check its validity
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Input
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter credential ID (e.g., 0x7a3f82b9...)"
            className="flex-1 font-mono"
          />
          <Button onClick={handleVerify} isLoading={isVerifying}>
            <Shield className="w-4 h-4" />
            Verify
          </Button>
        </div>
      </Card>

      {/* Results */}
      {hasSearched && result && (
        <div className="animate-slide-up">
          {result.valid && result.credential ? (
            <ValidCredentialResult credential={result.credential} />
          ) : (
            <InvalidCredentialResult error={result.error} />
          )}
        </div>
      )}
    </div>
  );
}

function ValidCredentialResult({
  credential,
}: {
  credential: NonNullable<VerifyCredentialResponse["credential"]>;
}) {
  const tier = credential.tier as Tier;
  const credType = credential.type as CredentialType;
  const tierNames = CREDENTIAL_TIER_NAMES[credType];
  const tierRanges = CREDENTIAL_TIER_RANGES[credType];

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        `bg-gradient-to-br ${tierCardBg[tier]}`,
        "border-[var(--success)]/30"
      )}
    >
      {/* Holographic effect */}
      <div className="absolute inset-0 holographic opacity-10 pointer-events-none" />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-[var(--success)]/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-[var(--success)]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--success)] font-[var(--font-display)]">
              Valid Credential
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              This credential is active and verified
            </p>
          </div>
        </div>

        {/* Credential Info */}
        <div className="text-center mb-6 py-6 border-y border-[var(--border-light)]">
          <div className="flex justify-center mb-4">
            <BadgeImage type={credType} tier={tier} />
          </div>
          <h4 className="text-2xl font-bold text-[var(--text-primary)]">
            {tierNames?.[tier] || credential.tierName} Tier
          </h4>
          <p className="text-[var(--text-secondary)]">
            {CREDENTIAL_LABELS[credential.type] || credential.type}
          </p>
          <p className="text-sm text-[var(--text-muted)]">{tierRanges?.[tier] || ""}</p>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-6">
          <DetailRow label="Credential ID" value={truncateId(credential.id)} mono />
          <DetailRow label="Type" value={credential.type} />
          <DetailRow label="Tier" value={`${tier} (${credential.tierName})`} />
          <DetailRow
            label="Issued"
            value={new Date(credential.issuedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          />
          <DetailRow
            label="Status"
            value={
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                {credential.status === "active" ? "Active" : "Revoked"}
              </span>
            }
          />
        </div>

        {/* What this proves */}
        <div className="p-4 bg-[var(--bg-secondary)] rounded-xl mb-6">
          <h5 className="text-sm font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--success)]" />
            This credential proves
          </h5>
          <ul className="space-y-2">
            {getProofTexts(credential.type, tier).map((text) => (
              <ProofItem key={text} text={text} />
            ))}
          </ul>
        </div>

        {/* Actions */}
        <Button
          variant="secondary"
          onClick={() =>
            window.open(`https://sepolia.voyager.online/search/${credential.id}`, "_blank")
          }
          className="w-full"
        >
          <ExternalLink className="w-4 h-4" />
          View on Starkscan
        </Button>
      </div>
    </Card>
  );
}

function InvalidCredentialResult({ error }: { error?: string }) {
  return (
    <Card className="border-[var(--error)]/30">
      <div className="p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--error)]/10 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-[var(--error)]" />
        </div>
        <h3 className="text-xl font-bold text-[var(--error)] font-[var(--font-display)] mb-2">
          Invalid Credential
        </h3>
        <p className="text-[var(--text-muted)] mb-4">
          {error || "This credential was not found or has been revoked."}
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-subtle)]">
          <AlertCircle className="w-4 h-4" />
          Double-check the credential ID and try again
        </div>
      </div>
    </Card>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span
        className={cn("text-[var(--text-primary)] font-medium", mono && "font-mono text-xs")}
      >
        {value}
      </span>
    </div>
  );
}

function ProofItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      <svg
        className="w-4 h-4 text-[var(--success)] flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {text}
    </li>
  );
}

function BadgeImage({ type, tier }: { type: CredentialType; tier: Tier }) {
  const config = CREDENTIAL_CONFIG[type];
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!config) return null;
  const src = `${basePath}${config.tiers[tier].image}`;
  return (
    <img
      src={src}
      alt={`${config.tiers[tier].name} badge`}
      className="w-20 h-20 object-contain drop-shadow-md"
    />
  );
}

function truncateId(id: string): string {
  if (id.length <= 20) return id;
  return `${id.slice(0, 10)}...${id.slice(-8)}`;
}

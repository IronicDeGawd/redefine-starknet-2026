"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TierBadge } from "./TierBadge";
import type { Credential, Tier } from "@/types/credential";
import { TIER_EMOJIS, TIER_NAMES, TIER_RANGES } from "@/types/credential";
import { Copy, ExternalLink, Share2, Trash2, Check, Shield } from "lucide-react";

interface CredentialCardProps {
  credential: Credential;
  variant?: "compact" | "full";
  onRevoke?: () => void;
}

const tierGradients: Record<Tier, string> = {
  0: "from-pink-500/20 to-rose-600/20",
  1: "from-orange-500/20 to-amber-600/20",
  2: "from-cyan-500/20 to-blue-600/20",
  3: "from-violet-500/20 to-purple-600/20",
};

const tierBorders: Record<Tier, string> = {
  0: "border-pink-500/30",
  1: "border-orange-500/30",
  2: "border-cyan-500/30",
  3: "border-violet-500/30",
};

export function CredentialCard({ credential, variant = "compact", onRevoke }: CredentialCardProps) {
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    await navigator.clipboard.writeText(credential.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCredential = async () => {
    const url = `${window.location.origin}/verify?id=${credential.id}`;
    if (navigator.share) {
      await navigator.share({
        title: `ZKCred ${TIER_NAMES[credential.tier]} Credential`,
        text: `Verify my ${TIER_NAMES[credential.tier]} tier credential`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (variant === "compact") {
    return (
      <Card
        interactive
        className={cn(
          "relative overflow-hidden",
          `bg-gradient-to-br ${tierGradients[credential.tier]}`,
          tierBorders[credential.tier]
        )}
      >
        {/* Holographic shimmer effect */}
        <div className="absolute inset-0 holographic opacity-10 pointer-events-none" />

        <div className="relative p-5">
          {/* Emoji & Tier */}
          <div className="text-center mb-4">
            <span className="text-5xl block mb-2">{TIER_EMOJIS[credential.tier]}</span>
            <h3 className="text-lg font-bold text-[var(--text-primary)] font-[var(--font-display)]">
              {TIER_NAMES[credential.tier]} Tier
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              {credential.credentialType === "btc_tier" ? "BTC Holdings" : "Wallet Age"}
            </p>
            <p className="text-xs text-[var(--text-subtle)]">{TIER_RANGES[credential.tier]}</p>
          </div>

          {/* Status & Date */}
          <div className="flex items-center justify-between text-sm mb-4 py-2 border-t border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)]">Status</span>
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  credential.revoked ? "bg-[var(--error)]" : "bg-[var(--success)]"
                )}
              />
              <span className="text-[var(--text-primary)]">
                {credential.revoked ? "Revoked" : "Active"}
              </span>
            </span>
          </div>

          {/* ID */}
          <div className="mb-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Credential ID</p>
            <code className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-1 rounded block truncate">
              {credential.id}
            </code>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={copyId}
              className="flex-1"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={shareCredential}
              className="flex-1"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Full variant
  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        `bg-gradient-to-br ${tierGradients[credential.tier]}`,
        tierBorders[credential.tier]
      )}
    >
      {/* Holographic effect */}
      <div className="absolute inset-0 holographic opacity-5 pointer-events-none" />

      <div className="relative p-6">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <span className="text-6xl block mb-4">{TIER_EMOJIS[credential.tier]}</span>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] font-[var(--font-display)] mb-1">
            {TIER_NAMES[credential.tier]} Tier
          </h2>
          <p className="text-[var(--text-secondary)]">
            {credential.credentialType === "btc_tier" ? "BTC Holdings" : "Wallet Age"}
          </p>
          <p className="text-sm text-[var(--text-muted)]">{TIER_RANGES[credential.tier]}</p>
        </div>

        {/* Credential ID */}
        <div className="mb-6 p-4 bg-[var(--bg-secondary)] rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-mono">
              Credential ID
            </span>
            <button
              onClick={copyId}
              className="text-[var(--accent-secondary)] hover:text-[var(--accent-primary)] transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <code className="text-sm font-mono text-[var(--text-primary)] break-all">
            {credential.id}
          </code>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-6">
          <DetailRow label="Type" value={credential.credentialType} />
          <DetailRow label="Tier" value={`${credential.tier} (${TIER_NAMES[credential.tier]})`} />
          <DetailRow label="Issued" value={formatDate(credential.issuedAt)} />
          <DetailRow
            label="Status"
            value={
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    credential.revoked ? "bg-[var(--error)]" : "bg-[var(--success)]"
                  )}
                />
                {credential.revoked ? "Revoked" : "Active"}
              </span>
            }
          />
          <DetailRow label="Network" value="Starknet Sepolia" />
        </div>

        {/* What this proves */}
        <div className="mb-6 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--success)]" />
            What this proves
          </h4>
          <ul className="space-y-2">
            <ProofItem text="Holder controls a Bitcoin wallet" />
            <ProofItem text={`Holdings verified in ${TIER_RANGES[credential.tier]} range`} />
            <ProofItem text="Credential issued on Starknet blockchain" />
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={shareCredential} className="flex-1">
            <Share2 className="w-4 h-4" />
            Share Link
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              window.open(
                `https://sepolia.starkscan.co/search/${credential.id}`,
                "_blank"
              )
            }
          >
            <ExternalLink className="w-4 h-4" />
            Starkscan
          </Button>
        </div>

        {/* Revoke */}
        {onRevoke && !credential.revoked && (
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRevoke}
              className="w-full text-[var(--error)] hover:bg-[var(--error)]/10"
            >
              <Trash2 className="w-4 h-4" />
              Revoke Credential
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="text-[var(--text-primary)] font-medium">{value}</span>
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

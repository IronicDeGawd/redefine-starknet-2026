"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PixelBadge } from "./PixelBadge";
import { MintBadgeButton } from "./MintBadgeButton";
import type { Credential, Tier } from "@/types/credential";
import { CREDENTIAL_CONFIG, getBadgeInfo } from "@/lib/badges/config";
import { Copy, ExternalLink, Share2, Trash2, Check, Shield, CheckCircle2 } from "lucide-react";

interface CredentialCardProps {
  credential: Credential;
  variant?: "compact" | "full";
  onRevoke?: () => void;
  onMinted?: (tokenId: string) => void;
}

const tierCardBg: Record<Tier, string> = {
  0: "bg-gradient-to-br from-[var(--tier-shrimp-bg)] to-white",
  1: "bg-gradient-to-br from-[var(--tier-crab-bg)] to-white",
  2: "bg-gradient-to-br from-[var(--tier-fish-bg)] to-white",
  3: "bg-gradient-to-br from-[var(--tier-whale-bg)] to-white",
};

export function CredentialCard({ credential, variant = "compact", onRevoke, onMinted }: CredentialCardProps) {
  const [copied, setCopied] = useState(false);
  const config = CREDENTIAL_CONFIG[credential.credentialType];
  const tierInfo = getBadgeInfo(credential.credentialType, credential.tier);

  const copyId = async () => {
    await navigator.clipboard.writeText(credential.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCredential = async () => {
    const url = `${window.location.origin}/verify?id=${credential.id}`;
    if (navigator.share) {
      await navigator.share({
        title: `ZKCred ${tierInfo.name} Credential`,
        text: `Verify my ${tierInfo.name} tier credential`,
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
          tierCardBg[credential.tier]
        )}
      >
        <div className="relative p-5">
          {/* Badge & Tier */}
          <div className="text-center mb-4">
            <div className="flex justify-center mb-3">
              <PixelBadge
                credentialType={credential.credentialType}
                tier={credential.tier}
                size="lg"
              />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              {tierInfo.name} Tier
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {config.label}
            </p>
          </div>

          {/* Status & Date */}
          <div className="flex items-center justify-between text-sm mb-4 py-3 border-t border-b border-[var(--border-light)]">
            <span className="text-[var(--text-muted)]">Status</span>
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  credential.revoked ? "bg-[var(--error)]" : "bg-[var(--success)]"
                )}
              />
              <span className={credential.revoked ? "text-[var(--error)]" : "text-[var(--success)]"}>
                {credential.revoked ? "Revoked" : "Active"}
              </span>
            </span>
          </div>

          {/* ID */}
          <div className="mb-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Credential ID</p>
            <code className="text-xs font-mono text-[var(--text-secondary)] bg-white px-2 py-1.5 rounded-lg border border-[var(--border-light)] block truncate">
              {credential.id}
            </code>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyId}
              className="flex-1"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="outline"
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
        tierCardBg[credential.tier]
      )}
    >
      <div className="relative p-6">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <div className="flex justify-center mb-4">
            <PixelBadge
              credentialType={credential.credentialType}
              tier={credential.tier}
              size="lg"
            />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
            {tierInfo.name} Tier
          </h2>
          <p className="text-[var(--text-secondary)]">
            {config.label}
          </p>
          <p className="text-sm text-[var(--text-muted)]">{config.description}</p>
        </div>

        {/* Credential ID */}
        <div className="mb-6 p-4 bg-white rounded-xl border border-[var(--border-light)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">
              Credential ID
            </span>
            <button
              onClick={copyId}
              className="text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
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
          <DetailRow label="Type" value={config.label} />
          <DetailRow label="Tier" value={`${credential.tier} (${tierInfo.name})`} />
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
                <span className={credential.revoked ? "text-[var(--error)]" : "text-[var(--success)]"}>
                  {credential.revoked ? "Revoked" : "Active"}
                </span>
              </span>
            }
          />
          <DetailRow label="Network" value="Starknet Sepolia" />
        </div>

        {/* What this proves */}
        <div className="mb-6 p-4 bg-white rounded-xl border border-[var(--border-light)]">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--primary)]" />
            What this proves
          </h4>
          <ul className="space-y-2">
            <ProofItem text={`Verified ${config.label} credential`} />
            <ProofItem text={`Tier ${credential.tier} (${tierInfo.name}) achieved`} />
            <ProofItem text="Credential issued on Starknet blockchain" />
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={shareCredential} className="flex-1">
            <Share2 className="w-4 h-4" />
            Share Link
          </Button>
          <MintBadgeButton credential={credential} onMinted={onMinted} />
          <Button
            variant="outline"
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
          <div className="mt-4 pt-4 border-t border-[var(--border-light)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRevoke}
              className="w-full text-[var(--error)] hover:bg-[var(--error-light)]"
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
      <CheckCircle2 className="w-4 h-4 text-[var(--success)] flex-shrink-0" />
      {text}
    </li>
  );
}

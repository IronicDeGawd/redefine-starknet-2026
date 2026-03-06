"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PixelBadge } from "@/components/credential/PixelBadge";
import {
  CREDENTIAL_CONFIG,
  getTierName,
  type ConnectorConfig,
} from "@/lib/badges/config";
import type { CredentialType, Tier } from "@/types/credential";
import { cn } from "@/lib/cn";
import {
  Search,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Fingerprint,
} from "lucide-react";

interface LookedUpCredential {
  id: string;
  type: string;
  tier: number;
  tierName: string;
  issuedAt: string;
  revoked: boolean;
  status: "active" | "revoked";
  transactionHash?: string;
}

const TIER_EMOJIS: Record<number, string> = { 0: "\u{1F331}", 1: "\u2B50", 2: "\u{1F48E}", 3: "\u{1F451}" };

const CREDENTIAL_ICONS: Record<string, string> = {
  btc_tier: "\u20BF",
  wallet_age: "\u231B",
  eth_holder: "\u2B26",
  github_dev: "\u{1F4BB}",
  codeforces_coder: "\u{1F3AF}",
  steam_gamer: "\u{1F3AE}",
  strava_athlete: "\u{1F3C3}",
};

export default function PassportPage() {
  const [query, setQuery] = useState("");
  const [credential, setCredential] = useState<LookedUpCredential | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleLookup = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setCredential(null);
    setSearched(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/credential/${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Credential not found (${res.status})`);
        return;
      }
      const data = await res.json();
      setCredential(data.credential ?? data);
    } catch {
      setError("Failed to look up credential. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://sepolia.voyager.online";

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold mb-4">
            <Fingerprint className="w-3.5 h-3.5" />
            Reputation Passport
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] font-[var(--font-display)] mb-2">
            Reputation Passport
          </h1>
          <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
            Look up any on-chain credential by ID. View the verified tier, badge, and status
            across all supported platforms.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="flex gap-3"
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter credential ID (e.g. zkcred_abc123...)"
              icon={<Search className="w-4 h-4" />}
              inputSize="lg"
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !query.trim()}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Lookup"
              )}
            </Button>
          </form>
        </div>

        {/* Result Card */}
        {searched && (
          <div className="max-w-2xl mx-auto mb-12">
            {error && (
              <Card className="p-6">
                <div className="flex items-center gap-3 text-[var(--error)]">
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </Card>
            )}

            {credential && (
              <Card className="overflow-hidden">
                {/* Passport Header */}
                <div
                  className="p-6 pb-4"
                  style={{
                    background: credential.status === "active"
                      ? "linear-gradient(135deg, var(--primary-light) 0%, white 100%)"
                      : "linear-gradient(135deg, var(--error-light) 0%, white 100%)",
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[var(--primary)]" />
                      <span className="text-sm font-semibold text-[var(--primary)] uppercase tracking-wider">
                        ZKCred Passport
                      </span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                        credential.status === "active"
                          ? "bg-[var(--success-light)] text-[var(--success)]"
                          : "bg-[var(--error-light)] text-[var(--error)]"
                      )}
                    >
                      {credential.status === "active" ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {credential.status === "active" ? "Active" : "Revoked"}
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    {isValidCredentialType(credential.type) && (
                      <PixelBadge
                        credentialType={credential.type as CredentialType}
                        tier={credential.tier as Tier}
                        size="lg"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
                        {getConfigLabel(credential.type)}
                      </p>
                      <h2 className="text-xl font-bold text-[var(--text-primary)] font-[var(--font-display)]">
                        {TIER_EMOJIS[credential.tier] ?? "\u2728"}{" "}
                        {credential.tierName}
                      </h2>
                      <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                        Tier {credential.tier} of 3
                      </p>
                    </div>
                  </div>
                </div>

                {/* Passport Body */}
                <div className="p-6 pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
                      <p className="text-xs text-[var(--text-muted)] mb-0.5">Credential ID</p>
                      <p className="text-sm font-mono text-[var(--text-primary)] truncate">
                        {credential.id}
                      </p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
                      <p className="text-xs text-[var(--text-muted)] mb-0.5">Type</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {getConfigLabel(credential.type)}
                      </p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
                      <p className="text-xs text-[var(--text-muted)] mb-0.5">Issued</p>
                      <p className="text-sm text-[var(--text-primary)]">
                        {new Date(credential.issuedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
                      <p className="text-xs text-[var(--text-muted)] mb-0.5">Verified On-Chain</p>
                      <p className="text-sm text-[var(--success)] font-medium flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Starknet Sepolia
                      </p>
                    </div>
                  </div>

                  <a
                    href={
                      credential.transactionHash
                        ? `${explorerUrl}/tx/${credential.transactionHash}`
                        : `${explorerUrl}/contract/${process.env.NEXT_PUBLIC_CREDENTIAL_REGISTRY_ADDRESS}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm text-[var(--primary)] hover:text-[var(--primary-dark)] font-medium py-2 transition-colors"
                  >
                    View on Explorer
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* All Credential Types Grid */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] font-[var(--font-display)] mb-1">
            Supported Credentials
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            7 platforms, 28 unique tiers. Prove your reputation without revealing your identity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(CREDENTIAL_CONFIG).map(
            ([type, config]: [string, ConnectorConfig]) => (
              <Card key={type} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-lg">
                    {CREDENTIAL_ICONS[type] ?? "\u{1F3C6}"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                      {config.label}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {config.description}
                    </p>
                  </div>
                </div>

                {/* Tier badges row */}
                <div className="flex items-center gap-2">
                  {([0, 1, 2, 3] as Tier[]).map((tier) => (
                    <div key={tier} className="flex flex-col items-center gap-1 flex-1">
                      <PixelBadge
                        credentialType={type as CredentialType}
                        tier={tier}
                        size="sm"
                      />
                      <span className="text-[10px] text-[var(--text-muted)] text-center leading-tight">
                        {getTierName(type, tier)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function isValidCredentialType(type: string): type is CredentialType {
  return type in CREDENTIAL_CONFIG;
}

function getConfigLabel(type: string): string {
  const config = CREDENTIAL_CONFIG[type as CredentialType];
  return config?.label ?? type;
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/useAppStore";
import { CredentialCard } from "@/components/credential/CredentialCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TIER_EMOJIS, type Credential, type CredentialType } from "@/types/credential";
import { Plus, Filter, Grid, List, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/cn";

type FilterType = "all" | CredentialType;
type ViewMode = "grid" | "list";

export default function CredentialsPage() {
  const { credentials, removeCredential } = useAppStore();
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const filteredCredentials = credentials.filter((cred) => {
    if (filter === "all") return true;
    return cred.credentialType === filter;
  });

  const handleRevoke = (id: string) => {
    if (confirm("Are you sure you want to remove this credential from your list?")) {
      removeCredential(id);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] font-[var(--font-display)] mb-1">
              Your Credentials
            </h1>
            <p className="text-[var(--text-muted)]">
              {credentials.length} credential{credentials.length !== 1 ? "s" : ""} issued
            </p>
          </div>
          <Link href="/">
            <Button>
              <Plus className="w-4 h-4" />
              New Credential
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--text-muted)]" />
            <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-lg">
              {(["all", "btc_tier", "wallet_age"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    filter === f
                      ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {f === "all" ? "All" : f === "btc_tier" ? "BTC Tier" : "Wallet Age"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-lg">
            {(["grid", "list"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  viewMode === mode
                    ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {mode === "grid" ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Credentials */}
        {filteredCredentials.length > 0 ? (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-4"
            )}
          >
            {filteredCredentials.map((credential) => (
              <CredentialCard
                key={credential.id}
                credential={credential}
                variant={viewMode === "grid" ? "compact" : "full"}
                onRevoke={() => handleRevoke(credential.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState hasFilter={filter !== "all"} onClearFilter={() => setFilter("all")} />
        )}
      </div>
    </div>
  );
}

function EmptyState({
  hasFilter,
  onClearFilter,
}: {
  hasFilter: boolean;
  onClearFilter: () => void;
}) {
  return (
    <Card className="p-12">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-6">
          <BadgeCheck className="w-8 h-8 text-[var(--accent-primary)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] font-[var(--font-display)] mb-2">
          {hasFilter ? "No matching credentials" : "No credentials yet"}
        </h3>
        <p className="text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
          {hasFilter
            ? "Try changing the filter or create a new credential."
            : "Create your first privacy credential to prove your Bitcoin holdings without revealing your wallet."}
        </p>
        <div className="flex items-center justify-center gap-3">
          {hasFilter && (
            <Button variant="secondary" onClick={onClearFilter}>
              Clear Filter
            </Button>
          )}
          <Link href="/">
            <Button>
              <Plus className="w-4 h-4" />
              Create Credential
            </Button>
          </Link>
        </div>

        {/* Tier preview */}
        {!hasFilter && (
          <div className="mt-8 pt-8 border-t border-[var(--border-subtle)]">
            <p className="text-sm text-[var(--text-muted)] mb-4">Available tiers:</p>
            <div className="flex justify-center gap-6">
              {[0, 1, 2, 3].map((tier) => (
                <div key={tier} className="text-center">
                  <span className="text-3xl block mb-1">
                    {TIER_EMOJIS[tier as 0 | 1 | 2 | 3]}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {tier === 0
                      ? "Shrimp"
                      : tier === 1
                      ? "Crab"
                      : tier === 2
                      ? "Fish"
                      : "Whale"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

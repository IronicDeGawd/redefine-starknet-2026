"use client";

import { useSearchParams } from "next/navigation";
import { CredentialVerifier } from "@/components/credential/CredentialVerifier";
import { Suspense } from "react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") || undefined;

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] font-[var(--font-display)] mb-2">
            Verify Credential
          </h1>
          <p className="text-[var(--text-muted)]">
            Check if a credential is valid and see what it proves
          </p>
        </div>

        {/* Verifier Component */}
        <CredentialVerifier initialId={initialId} />

        {/* Info Section */}
        <div className="mt-12 p-6 bg-[var(--bg-secondary)]/50 rounded-xl border border-[var(--border-subtle)]">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
            How Verification Works
          </h3>
          <div className="space-y-4 text-sm text-[var(--text-secondary)]">
            <p>
              <strong className="text-[var(--text-primary)]">1. On-Chain Verification:</strong>{" "}
              Credentials are stored on Starknet. We query the blockchain to verify authenticity.
            </p>
            <p>
              <strong className="text-[var(--text-primary)]">2. Privacy Preserved:</strong>{" "}
              Only the credential tier is revealed. The holder&apos;s wallet address remains hidden.
            </p>
            <p>
              <strong className="text-[var(--text-primary)]">3. Instant Results:</strong>{" "}
              Verification takes just a few seconds and is completely free.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

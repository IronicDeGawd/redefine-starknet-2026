"use client";

import { useCallback, useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import type { Credential, CredentialType, Tier } from "@/types/credential";
import type { IssueCredentialResponse, VerifyCredentialResponse } from "@/types/api";

export function useCredential() {
  const { credentials, addCredential, removeCredential } = useAppStore();
  const [isIssuing, setIsIssuing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const issueCredential = useCallback(
    async (params: {
      btcPubkey: string;
      btcAddress: string;
      signature: string;
      message: string;
      credentialType: CredentialType;
      tier: Tier;
    }): Promise<IssueCredentialResponse> => {
      setIsIssuing(true);

      try {
        const response = await fetch("/api/credential", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        const data: IssueCredentialResponse = await response.json();

        if (data.success && data.credentialId) {
          // Add to local storage
          const newCredential: Credential = {
            id: data.credentialId,
            pubkeyHash: "", // We don't store the actual hash client-side
            credentialType: params.credentialType,
            tier: params.tier,
            issuedAt: new Date().toISOString(),
            revoked: false,
          };
          addCredential(newCredential);
        }

        return data;
      } catch (error) {
        console.error("Issue credential error:", error);
        return {
          success: false,
          error: "Failed to issue credential. Please try again.",
        };
      } finally {
        setIsIssuing(false);
      }
    },
    [addCredential]
  );

  const verifyCredential = useCallback(
    async (credentialId: string): Promise<VerifyCredentialResponse> => {
      setIsVerifying(true);

      try {
        const response = await fetch(`/api/verify?id=${encodeURIComponent(credentialId)}`);
        const data: VerifyCredentialResponse = await response.json();
        return data;
      } catch (error) {
        console.error("Verify credential error:", error);
        return {
          valid: false,
          error: "Failed to verify credential. Please try again.",
        };
      } finally {
        setIsVerifying(false);
      }
    },
    []
  );

  const revokeCredential = useCallback(
    (credentialId: string) => {
      removeCredential(credentialId);
    },
    [removeCredential]
  );

  return {
    credentials,
    isIssuing,
    isVerifying,
    issueCredential,
    verifyCredential,
    revokeCredential,
  };
}

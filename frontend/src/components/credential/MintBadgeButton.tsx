"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import type { Credential } from "@/types/credential";

interface MintBadgeButtonProps {
  credential: Credential;
  onMinted?: (tokenId: string) => void;
}

export function MintBadgeButton({ credential, onMinted }: MintBadgeButtonProps) {
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (credential.nftTokenId) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          window.open(
            `https://sepolia.voyager.online/nft/${credential.nftTokenId}`,
            "_blank"
          )
        }
      >
        <ExternalLink className="w-4 h-4" />
        NFT #{credential.nftTokenId}
      </Button>
    );
  }

  const handleMint = async () => {
    setMinting(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/nft/mint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialId: credential.id,
          // For hackathon demo: use a placeholder address
          // In production, this would come from the user's connected wallet
          starknetAddress: credential.pubkeyHash,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Mint failed");
        return;
      }

      onMinted?.(data.tokenId);
    } catch {
      setError("Network error");
    } finally {
      setMinting(false);
    }
  };

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleMint}
        disabled={minting || credential.revoked}
      >
        {minting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Minting...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Mint Badge
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-[var(--error)] mt-1">{error}</p>
      )}
    </div>
  );
}

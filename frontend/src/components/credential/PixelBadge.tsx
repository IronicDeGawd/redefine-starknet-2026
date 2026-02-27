"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { getBadgeInfo } from "@/lib/badges/config";
import { TierIcon } from "./TierBadge";
import type { CredentialType, Tier } from "@/types/credential";

interface PixelBadgeProps {
  credentialType: CredentialType;
  tier: Tier;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: 48,
  md: 80,
  lg: 128,
};

export function PixelBadge({ credentialType, tier, size = "md", className }: PixelBadgeProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const info = getBadgeInfo(credentialType, tier);
  const px = sizeMap[size];

  if (error) {
    return <TierIcon tier={tier} size={size} />;
  }

  return (
    <div
      className={cn("relative flex-shrink-0", className)}
      style={{ width: px, height: px }}
    >
      {!loaded && (
        <div
          className="absolute inset-0 rounded-xl bg-[var(--bg-secondary)] animate-pulse"
          style={{ width: px, height: px }}
        />
      )}
      <img
        src={info.image}
        alt={`${info.name} badge`}
        width={px}
        height={px}
        className={cn(
          "rounded-xl",
          !loaded && "opacity-0",
          loaded && "opacity-100 transition-opacity duration-200"
        )}
        style={{ imageRendering: "pixelated" }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

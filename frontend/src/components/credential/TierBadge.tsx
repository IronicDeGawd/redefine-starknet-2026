"use client";

import { cn } from "@/lib/cn";
import { TIER_NAMES, TIER_RANGES, type Tier } from "@/types/credential";
import { CircleDot, Hexagon, Diamond, Crown, type LucideIcon } from "lucide-react";

// Lucide icons for each tier (using abstract shapes for consistent style)
const TIER_ICONS: Record<Tier, LucideIcon> = {
  0: CircleDot,  // Shrimp - simple dot
  1: Hexagon,    // Crab - hexagon shape
  2: Diamond,    // Fish - diamond shape
  3: Crown,      // Whale - crown for top tier
};

// Light theme tier styles matching Figma design
const tierStyles: Record<Tier, { bg: string; iconBg: string; text: string; icon: string }> = {
  0: {
    bg: "bg-[var(--tier-shrimp-bg)]",
    iconBg: "bg-[var(--grey-200)]",
    text: "text-[var(--grey-700)]",
    icon: "text-[var(--tier-shrimp)]",
  },
  1: {
    bg: "bg-[var(--tier-crab-bg)]",
    iconBg: "bg-[var(--tier-crab-bg)]",
    text: "text-amber-800",
    icon: "text-[var(--tier-crab)]",
  },
  2: {
    bg: "bg-[var(--tier-fish-bg)]",
    iconBg: "bg-[var(--tier-fish-bg)]",
    text: "text-blue-800",
    icon: "text-[var(--tier-fish)]",
  },
  3: {
    bg: "bg-[var(--tier-whale-bg)]",
    iconBg: "bg-[var(--tier-whale-bg)]",
    text: "text-violet-800",
    icon: "text-[var(--tier-whale)]",
  },
};

interface TierBadgeProps {
  tier: Tier;
  size?: "sm" | "md" | "lg";
  showRange?: boolean;
  variant?: "default" | "filled";
}

const sizes = {
  sm: {
    container: "px-2.5 py-1 gap-1.5",
    icon: "w-3.5 h-3.5",
    name: "text-xs",
    range: "text-[10px]",
  },
  md: {
    container: "px-3 py-1.5 gap-2",
    icon: "w-4 h-4",
    name: "text-sm",
    range: "text-xs",
  },
  lg: {
    container: "px-4 py-2 gap-2.5",
    icon: "w-5 h-5",
    name: "text-base",
    range: "text-sm",
  },
};

export function TierBadge({ tier, size = "md", showRange = false, variant = "default" }: TierBadgeProps) {
  const style = tierStyles[tier];
  const sizeStyle = sizes[size];
  const Icon = TIER_ICONS[tier];

  if (variant === "filled") {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-full",
          style.bg,
          sizeStyle.container
        )}
      >
        <Icon className={cn(sizeStyle.icon, style.icon)} />
        <div className="flex flex-col">
          <span className={cn("font-semibold leading-tight", style.text, sizeStyle.name)}>
            {TIER_NAMES[tier]}
          </span>
          {showRange && (
            <span className={cn("opacity-70 leading-tight", style.text, sizeStyle.range)}>
              {TIER_RANGES[tier]}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border",
        style.bg,
        "border-transparent",
        sizeStyle.container
      )}
    >
      <Icon className={cn(sizeStyle.icon, style.icon)} />
      <div className="flex flex-col">
        <span className={cn("font-medium leading-tight", style.text, sizeStyle.name)}>
          {TIER_NAMES[tier]}
        </span>
        {showRange && (
          <span className={cn("opacity-60 leading-tight", style.text, sizeStyle.range)}>
            {TIER_RANGES[tier]}
          </span>
        )}
      </div>
    </div>
  );
}

// Compact version for inline use
export function TierBadgeCompact({ tier }: { tier: Tier }) {
  const style = tierStyles[tier];
  const Icon = TIER_ICONS[tier];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        style.bg,
        style.text
      )}
    >
      <Icon className="w-3 h-3" />
      {TIER_NAMES[tier]}
    </span>
  );
}

// Icon-only version for compact displays
export function TierIcon({ tier, size = "md" }: { tier: Tier; size?: "sm" | "md" | "lg" }) {
  const style = tierStyles[tier];
  const Icon = TIER_ICONS[tier];

  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const innerIconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl",
        style.iconBg,
        iconSizes[size]
      )}
    >
      <Icon className={cn(innerIconSizes[size], style.icon)} />
    </div>
  );
}

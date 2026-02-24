"use client";

import { cn } from "@/lib/cn";
import { TIER_NAMES, TIER_EMOJIS, TIER_RANGES, type Tier } from "@/types/credential";

interface TierBadgeProps {
  tier: Tier;
  size?: "sm" | "md" | "lg";
  showRange?: boolean;
  glow?: boolean;
}

const tierStyles: Record<Tier, { gradient: string; glow: string; text: string }> = {
  0: {
    gradient: "from-pink-500 to-rose-600",
    glow: "shadow-[0_0_30px_rgba(244,114,182,0.4)]",
    text: "text-pink-400",
  },
  1: {
    gradient: "from-orange-500 to-amber-600",
    glow: "shadow-[0_0_30px_rgba(251,146,60,0.4)]",
    text: "text-orange-400",
  },
  2: {
    gradient: "from-cyan-500 to-blue-600",
    glow: "shadow-[0_0_30px_rgba(34,211,238,0.4)]",
    text: "text-cyan-400",
  },
  3: {
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-[0_0_30px_rgba(167,139,250,0.4)]",
    text: "text-violet-400",
  },
};

const sizes = {
  sm: {
    container: "px-2.5 py-1",
    emoji: "text-base",
    name: "text-xs",
    range: "text-[10px]",
  },
  md: {
    container: "px-3 py-1.5",
    emoji: "text-xl",
    name: "text-sm",
    range: "text-xs",
  },
  lg: {
    container: "px-4 py-2",
    emoji: "text-2xl",
    name: "text-base",
    range: "text-sm",
  },
};

export function TierBadge({ tier, size = "md", showRange = false, glow = false }: TierBadgeProps) {
  const style = tierStyles[tier];
  const sizeStyle = sizes[size];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full",
        `bg-gradient-to-r ${style.gradient}`,
        sizeStyle.container,
        glow && style.glow
      )}
    >
      <span className={sizeStyle.emoji}>{TIER_EMOJIS[tier]}</span>
      <div className="flex flex-col">
        <span className={cn("font-semibold text-white leading-tight", sizeStyle.name)}>
          {TIER_NAMES[tier]}
        </span>
        {showRange && (
          <span className={cn("text-white/70 leading-tight", sizeStyle.range)}>
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

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        `bg-gradient-to-r ${style.gradient}`,
        "text-white"
      )}
    >
      {TIER_EMOJIS[tier]} {TIER_NAMES[tier]}
    </span>
  );
}

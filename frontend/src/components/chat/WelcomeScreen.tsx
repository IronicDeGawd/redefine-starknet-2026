"use client";

import { Shield, Zap, Eye, Lock } from "lucide-react";
import { TIER_EMOJIS } from "@/types/credential";

interface WelcomeScreenProps {
  onQuickAction: (message: string) => void;
}

const quickActions = [
  {
    label: "Prove I'm a Whale",
    message: "I want to prove I hold more than 100 BTC",
    emoji: TIER_EMOJIS[3],
    gradient: "from-violet-500 to-purple-600",
  },
  {
    label: "Prove I'm a Fish",
    message: "I want to create a Fish tier credential (10-100 BTC)",
    emoji: TIER_EMOJIS[2],
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    label: "Prove I'm a Crab",
    message: "I want to prove I hold between 1-10 BTC",
    emoji: TIER_EMOJIS[1],
    gradient: "from-orange-500 to-amber-600",
  },
  {
    label: "Learn More",
    message: "What is ZKCred and how does it work?",
    emoji: "💡",
    gradient: "from-emerald-500 to-teal-600",
  },
];

const features = [
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your wallet address is never revealed",
  },
  {
    icon: Zap,
    title: "On-Chain Proof",
    description: "Verifiable credentials on Starknet",
  },
  {
    icon: Eye,
    title: "Selective Disclosure",
    description: "Prove holdings without exact amounts",
  },
  {
    icon: Lock,
    title: "Cryptographic Security",
    description: "Secured by Bitcoin signatures",
  },
];

export function WelcomeScreen({ onQuickAction }: WelcomeScreenProps) {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-cyan-500 shadow-[0_0_60px_var(--accent-glow)] mb-6">
          <span className="text-4xl">🔐</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4 font-[var(--font-display)]">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-[var(--accent-primary)] to-cyan-400 bg-clip-text text-transparent">
            ZKCred
          </span>
        </h1>

        <p className="text-lg text-[var(--text-secondary)] max-w-md mx-auto">
          Create privacy-preserving credentials for your Bitcoin holdings.
          Prove your tier without revealing your wallet.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-12">
        <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4 text-center">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => onQuickAction(action.message)}
              className="group relative p-4 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] rounded-xl transition-all duration-200 text-left"
            >
              <span className="text-2xl mb-2 block">{action.emoji}</span>
              <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-secondary)]">
                {action.label}
              </span>

              {/* Hover gradient */}
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-200 pointer-events-none`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-2 gap-4">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="flex items-start gap-3 p-4 bg-[var(--bg-secondary)]/50 rounded-lg"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center">
              <feature.icon className="w-4 h-4 text-[var(--accent-primary)]" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                {feature.title}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Tier legend */}
      <div className="mt-8 p-4 bg-[var(--bg-secondary)]/50 rounded-xl border border-[var(--border-subtle)]">
        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
          BTC Tiers
        </h3>
        <div className="flex flex-wrap gap-4 justify-center">
          {[
            { tier: 0, name: "Shrimp", range: "< 1 BTC", color: "text-pink-400" },
            { tier: 1, name: "Crab", range: "1-10 BTC", color: "text-orange-400" },
            { tier: 2, name: "Fish", range: "10-100 BTC", color: "text-cyan-400" },
            { tier: 3, name: "Whale", range: "100+ BTC", color: "text-violet-400" },
          ].map((t) => (
            <div key={t.tier} className="flex items-center gap-2">
              <span className="text-lg">{TIER_EMOJIS[t.tier as 0 | 1 | 2 | 3]}</span>
              <div>
                <span className={`text-sm font-medium ${t.color}`}>{t.name}</span>
                <span className="text-xs text-[var(--text-muted)] ml-1">
                  ({t.range})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

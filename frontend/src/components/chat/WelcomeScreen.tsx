"use client";

import { Shield, Zap, Eye, Lock, Crown, Diamond, Hexagon, CircleDot } from "lucide-react";
import { TierIcon } from "@/components/credential/TierBadge";
import { TIER_NAMES, TIER_RANGES, type Tier } from "@/types/credential";

interface WelcomeScreenProps {
  onQuickAction: (message: string) => void;
}

const quickActions = [
  {
    label: "Prove I'm a Whale",
    message: "I want to prove I hold more than 100 BTC",
    tier: 3 as Tier,
    icon: Crown,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    hoverBg: "hover:bg-violet-100",
  },
  {
    label: "Prove I'm a Fish",
    message: "I want to create a Fish tier credential (10-100 BTC)",
    tier: 2 as Tier,
    icon: Diamond,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    hoverBg: "hover:bg-blue-100",
  },
  {
    label: "Prove I'm a Crab",
    message: "I want to prove I hold between 1-10 BTC",
    tier: 1 as Tier,
    icon: Hexagon,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    hoverBg: "hover:bg-amber-100",
  },
  {
    label: "Learn More",
    message: "What is ZKCred and how does it work?",
    tier: null,
    icon: Shield,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    hoverBg: "hover:bg-emerald-100",
  },
];

const features = [
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your wallet address is never revealed",
    color: "text-[var(--primary)]",
    bgColor: "bg-[var(--primary-light)]",
  },
  {
    icon: Zap,
    title: "On-Chain Proof",
    description: "Verifiable credentials on Starknet",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    icon: Eye,
    title: "Selective Disclosure",
    description: "Prove holdings without exact amounts",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
  },
  {
    icon: Lock,
    title: "Cryptographic Security",
    description: "Secured by Bitcoin signatures",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
];

const tiers: { tier: Tier; icon: typeof CircleDot }[] = [
  { tier: 0, icon: CircleDot },
  { tier: 1, icon: Hexagon },
  { tier: 2, icon: Diamond },
  { tier: 3, icon: Crown },
];

export function WelcomeScreen({ onQuickAction }: WelcomeScreenProps) {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] shadow-lg mb-6">
          <Shield className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">
          Welcome to{" "}
          <span className="text-gradient">
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
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => onQuickAction(action.message)}
                className={`group p-4 bg-white ${action.hoverBg} border border-[var(--border)] hover:border-[var(--border-hover)] rounded-2xl transition-all duration-200 text-left shadow-sm hover:shadow-md`}
              >
                <div className={`w-10 h-10 rounded-xl ${action.bgColor} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[var(--border-light)]"
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${feature.bgColor} flex items-center justify-center`}>
              <feature.icon className={`w-5 h-5 ${feature.color}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {feature.title}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Tier legend */}
      <div className="p-6 bg-white rounded-2xl border border-[var(--border-light)] shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          BTC Tier System
        </h3>
        <div className="flex flex-wrap gap-6 justify-center">
          {tiers.map(({ tier }) => (
            <div key={tier} className="flex items-center gap-3">
              <TierIcon tier={tier} size="md" />
              <div>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {TIER_NAMES[tier]}
                </span>
                <p className="text-xs text-[var(--text-muted)]">
                  {TIER_RANGES[tier]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

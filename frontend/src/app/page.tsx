"use client";

import Link from "next/link";
import { useAppStore } from "@/stores/useAppStore";
import { CREDENTIAL_CONFIG } from "@/lib/badges/config";
import type { CredentialType } from "@/types/credential";
import {
  MessageSquare,
  Plug,
  BadgeCheck,
  Shield,
  Fingerprint,
  FlaskConical,
  Crown,
  Lock,
  ArrowRight,
  Bitcoin,
  Wallet,
  Github,
  Gamepad2,
  Activity,
  Code,
  ShieldCheck,
  Layers,
  Globe,
  Sparkles,
} from "lucide-react";

const CREDENTIAL_ICONS: Record<CredentialType, typeof Bitcoin> = {
  btc_tier: Bitcoin,
  wallet_age: Wallet,
  eth_holder: Wallet,
  github_dev: Github,
  codeforces_coder: Code,
  steam_gamer: Gamepad2,
  strava_athlete: Activity,
};

const CREDENTIAL_COLORS: Record<CredentialType, { bg: string; text: string; border: string }> = {
  btc_tier: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  wallet_age: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
  eth_holder: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  github_dev: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-200" },
  codeforces_coder: { bg: "bg-cyan-50", text: "text-cyan-600", border: "border-cyan-200" },
  steam_gamer: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
  strava_athlete: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" },
};

const quickActions = [
  {
    label: "Create Credential",
    description: "Prove your identity with ZK proofs",
    href: "/connect",
    icon: Plug,
    color: "bg-[var(--primary)]",
    textColor: "text-white",
  },
  {
    label: "Start Chat",
    description: "AI-guided credential creation",
    href: "/chat",
    icon: MessageSquare,
    color: "bg-gradient-to-br from-violet-500 to-purple-600",
    textColor: "text-white",
  },
  {
    label: "View Passport",
    description: "Your reputation identity hub",
    href: "/passport",
    icon: Fingerprint,
    color: "bg-gradient-to-br from-emerald-500 to-teal-600",
    textColor: "text-white",
  },
  {
    label: "Verify Someone",
    description: "Check any credential on-chain",
    href: "/verify",
    icon: Shield,
    color: "bg-gradient-to-br from-amber-500 to-orange-600",
    textColor: "text-white",
  },
];

const features = [
  {
    title: "Zero-Knowledge Proofs",
    description: "Prove facts about yourself without revealing raw data. Your holdings, age, and activity stay private.",
    icon: ShieldCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "On-Chain Badges",
    description: "Mint soulbound NFT badges on Starknet as permanent proof of your verified credentials.",
    icon: Layers,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    title: "Multi-Chain Identity",
    description: "Connect Bitcoin, Ethereum, and social accounts into a unified reputation passport.",
    icon: Globe,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "AI-Powered Agent",
    description: "Chat with our AI agent to create credentials, verify identities, and explore the platform.",
    icon: Sparkles,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

const explorePages = [
  { href: "/chat", label: "Chat", description: "AI credential assistant", icon: MessageSquare, color: "text-violet-600" },
  { href: "/connect", label: "Connect", description: "Link accounts & wallets", icon: Plug, color: "text-blue-600" },
  { href: "/credentials", label: "Credentials", description: "View issued credentials", icon: BadgeCheck, color: "text-emerald-600" },
  { href: "/verify", label: "Verify", description: "Check any credential", icon: Shield, color: "text-amber-600" },
  { href: "/passport", label: "Passport", description: "Reputation identity hub", icon: Fingerprint, color: "text-rose-600" },
  { href: "/crypto", label: "Cryptography", description: "Learn ZK primitives", icon: Lock, color: "text-cyan-600" },
  { href: "/playground", label: "Playground", description: "Test ZK circuits", icon: FlaskConical, color: "text-purple-600" },
  { href: "/lounge", label: "Lounge", description: "Token-gated space", icon: Crown, color: "text-amber-600" },
];

export default function OverviewPage() {
  const btcWallet = useAppStore((s) => s.btcWallet);
  const address = btcWallet.address;

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary)] via-[var(--primary)] to-[var(--secondary)] p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoLTZ2LTZoNnptMC0zMHY2aC02VjRoNnptMCAzMHY2aC02di02aDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative">
          <p className="text-white/70 text-sm font-medium mb-1">
            {address ? `Connected: ${address.slice(0, 8)}...${address.slice(-6)}` : "Welcome back"}
          </p>
          <h1 className="text-3xl font-bold mb-2">ZKCred Platform</h1>
          <p className="text-white/80 max-w-lg mb-6">
            Create privacy-preserving credentials, build your reputation passport, and prove facts without revealing data.
          </p>
          <div className="flex gap-3">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[var(--primary)] font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Start Chat
            </Link>
            <Link
              href="/connect"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 text-white font-semibold rounded-xl hover:bg-white/25 transition-colors border border-white/20"
            >
              <Plug className="w-4 h-4" />
              Connect Account
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group ${action.color} ${action.textColor} p-5 rounded-2xl transition-all duration-200 hover:shadow-lg hover:scale-[1.02]`}
              >
                <Icon className="w-6 h-6 mb-3 opacity-90" />
                <p className="font-semibold text-sm">{action.label}</p>
                <p className="text-xs opacity-75 mt-1">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Credential Types */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Credential Types</h2>
          <Link href="/connect" className="text-sm text-[var(--primary)] hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.entries(CREDENTIAL_CONFIG) as [CredentialType, typeof CREDENTIAL_CONFIG[CredentialType]][]).map(
            ([type, config]) => {
              const Icon = CREDENTIAL_ICONS[type];
              const colors = CREDENTIAL_COLORS[type];
              const tierCount = Object.keys(config.tiers).length;
              return (
                <Link
                  key={type}
                  href="/connect"
                  className={`group p-4 bg-white rounded-xl border ${colors.border} hover:shadow-md transition-all duration-200`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                        {config.label}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{config.description}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-2">{tierCount} tiers available</p>
                    </div>
                  </div>
                </Link>
              );
            }
          )}
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-5 bg-white rounded-xl border border-[var(--border-light)] hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${feature.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[var(--text-primary)]">{feature.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Explore Sections */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Explore</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {explorePages.map((page) => {
            const Icon = page.icon;
            return (
              <Link
                key={page.href}
                href={page.href}
                className="group p-4 bg-white rounded-xl border border-[var(--border-light)] hover:border-[var(--primary)]/30 hover:shadow-sm transition-all duration-200"
              >
                <Icon className={`w-5 h-5 ${page.color} mb-2`} />
                <p className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                  {page.label}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{page.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

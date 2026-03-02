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
  btc_tier: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
  wallet_age: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  eth_holder: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  github_dev: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  codeforces_coder: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  steam_gamer: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/20" },
  strava_athlete: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
};

const quickActions = [
  {
    label: "Create Credential",
    description: "Prove your identity with ZK proofs",
    href: "/connect",
    icon: Plug,
    iconColor: "text-[var(--primary)]",
    iconBg: "bg-[var(--primary-light)]",
  },
  {
    label: "Start Chat",
    description: "AI-guided credential creation",
    href: "/chat",
    icon: MessageSquare,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10",
  },
  {
    label: "View Passport",
    description: "Your reputation identity hub",
    href: "/passport",
    icon: Fingerprint,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
  {
    label: "Verify Someone",
    description: "Check any credential on-chain",
    href: "/verify",
    icon: Shield,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10",
  },
];

const features = [
  {
    title: "Zero-Knowledge Proofs",
    description: "Prove facts about yourself without revealing raw data. Your holdings, age, and activity stay private.",
    icon: ShieldCheck,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
  {
    title: "On-Chain Badges",
    description: "Mint soulbound NFT badges on Starknet as permanent proof of your verified credentials.",
    icon: Layers,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10",
  },
  {
    title: "Multi-Chain Identity",
    description: "Connect Bitcoin, Ethereum, and social accounts into a unified reputation passport.",
    icon: Globe,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
  },
  {
    title: "AI-Powered Agent",
    description: "Chat with our AI agent to create credentials, verify identities, and explore the platform.",
    icon: Sparkles,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10",
  },
];

const explorePages = [
  { href: "/chat", label: "Chat", description: "AI credential assistant", icon: MessageSquare, iconColor: "text-purple-400" },
  { href: "/connect", label: "Connect", description: "Link accounts & wallets", icon: Plug, iconColor: "text-blue-400" },
  { href: "/credentials", label: "Credentials", description: "View issued credentials", icon: BadgeCheck, iconColor: "text-emerald-400" },
  { href: "/verify", label: "Verify", description: "Check any credential", icon: Shield, iconColor: "text-amber-400" },
  { href: "/passport", label: "Passport", description: "Reputation identity hub", icon: Fingerprint, iconColor: "text-rose-400" },
  { href: "/crypto", label: "Cryptography", description: "Learn ZK primitives", icon: Lock, iconColor: "text-sky-400" },
  { href: "/playground", label: "Playground", description: "Test ZK circuits", icon: FlaskConical, iconColor: "text-purple-400" },
  { href: "/lounge", label: "Lounge", description: "Token-gated space", icon: Crown, iconColor: "text-amber-400" },
];

export default function OverviewPage() {
  const btcWallet = useAppStore((s) => s.btcWallet);
  const address = btcWallet.address;

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] p-8 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="relative">
          <p className="text-white/60 text-sm font-medium mb-1">
            {address ? `Connected: ${address.slice(0, 8)}...${address.slice(-6)}` : "Welcome back"}
          </p>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "white" }}>ZKCred Platform</h1>
          <p className="text-white/70 max-w-lg mb-6">
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
                className="group p-5 bg-white rounded-2xl border border-[var(--border-light)] hover:border-[var(--border-hover)] hover:shadow-sm transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-xl ${action.iconBg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${action.iconColor}`} />
                </div>
                <p className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">{action.label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{action.description}</p>
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
                  <div className={`w-10 h-10 rounded-lg ${feature.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${feature.iconColor}`} />
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
                className="group p-4 bg-white rounded-xl border border-[var(--border-light)] hover:border-[var(--border-hover)] hover:shadow-sm transition-all duration-200"
              >
                <Icon className={`w-5 h-5 ${page.iconColor} mb-2`} />
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

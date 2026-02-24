"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TierIcon } from "@/components/credential/TierBadge";
import { TIER_NAMES, TIER_RANGES, type Tier } from "@/types/credential";
import { useBtcWallet } from "@/hooks/useBtcWallet";
import {
  Shield,
  Zap,
  Eye,
  Lock,
  Wallet,
  ArrowRight,
  Crown,
  Github,
  ExternalLink,
  Bitcoin,
} from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "Your wallet address is never revealed. Only prove what you need to prove.",
    color: "text-[var(--primary)]",
    bgColor: "bg-[var(--primary-light)]",
  },
  {
    icon: Zap,
    title: "On-Chain Proof",
    description:
      "Credentials are stored on Starknet, verifiable by anyone, anytime.",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    icon: Eye,
    title: "Selective Disclosure",
    description:
      "Prove your holdings tier without revealing exact amounts or addresses.",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
  },
  {
    icon: Lock,
    title: "Cryptographic Security",
    description:
      "Secured by Bitcoin signatures and zero-knowledge proofs on Starknet.",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
];

const steps = [
  {
    number: "01",
    title: "Connect Wallet",
    description: "Connect your Bitcoin wallet via Xverse to prove ownership.",
  },
  {
    number: "02",
    title: "Sign Message",
    description: "Sign a message to verify you control the wallet. No BTC spent.",
  },
  {
    number: "03",
    title: "Get Credential",
    description: "Receive a privacy-preserving credential on Starknet.",
  },
  {
    number: "04",
    title: "Share & Verify",
    description: "Share your credential ID for others to verify your tier.",
  },
];

export function LandingPage() {
  const { connect, isConnecting } = useBtcWallet();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[var(--border-light)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <span className="text-white font-bold text-sm">ZK</span>
            </div>
            <span className="font-semibold text-lg text-[var(--text-primary)]">
              ZK<span className="text-[var(--primary)]">Cred</span>
            </span>
          </div>
          <Button onClick={connect} isLoading={isConnecting} size="sm">
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-light)] rounded-full text-sm font-medium text-[var(--primary)] mb-6">
            <Bitcoin className="w-4 h-4" />
            Built on Starknet for RE:DEFINE Hackathon
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-[var(--text-primary)] mb-6 leading-tight">
            Prove Your Bitcoin Holdings{" "}
            <span className="text-gradient">Without Revealing Your Wallet</span>
          </h1>

          <p className="text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto">
            ZKCred creates privacy-preserving credentials that prove your BTC tier
            (Shrimp, Crab, Fish, or Whale) without exposing your address or exact balance.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={connect} isLoading={isConnecting} size="lg">
              <Wallet className="w-5 h-5" />
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                window.open("https://github.com/your-repo/zkcred", "_blank")
              }
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-[var(--background-secondary)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              Why ZKCred?
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              Traditional verification requires exposing your wallet. ZKCred lets you
              prove your tier while keeping everything else private.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="p-6">
                <div
                  className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}
                >
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tier System Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              BTC Tier System
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              Your credential proves which tier you belong to, without revealing
              your exact holdings or wallet address.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {([0, 1, 2, 3] as Tier[]).map((tier) => (
              <Card
                key={tier}
                className="p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-center mb-4">
                  <TierIcon tier={tier} size="lg" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">
                  {TIER_NAMES[tier]}
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  {TIER_RANGES[tier]}
                </p>
                <div className="text-xs text-[var(--text-secondary)]">
                  {tier === 0 && "Getting started with Bitcoin"}
                  {tier === 1 && "Building your stack"}
                  {tier === 2 && "Serious holder"}
                  {tier === 3 && "You've made it"}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-[var(--background-secondary)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              How It Works
            </h2>
            <p className="text-[var(--text-secondary)]">
              Get your credential in four simple steps
            </p>
          </div>

          <div className="space-y-6">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="flex items-start gap-6 p-6 bg-white rounded-2xl border border-[var(--border-light)]"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--primary-light)] flex items-center justify-center">
                  <span className="text-[var(--primary)] font-bold">
                    {step.number}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                    {step.title}
                  </h3>
                  <p className="text-[var(--text-secondary)]">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="hidden md:block w-5 h-5 text-[var(--text-muted)] ml-auto self-center" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              Use Cases
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              Privacy-preserving credentials open up new possibilities
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Whale-Only Access",
                description:
                  "Gate exclusive communities, airdrops, or opportunities to verified high-tier holders.",
                icon: Crown,
              },
              {
                title: "Anonymous Reputation",
                description:
                  "Build reputation based on your holdings without doxxing your wallet address.",
                icon: Shield,
              },
              {
                title: "DeFi Integrations",
                description:
                  "Access better rates or features based on your verified holdings tier.",
                icon: Zap,
              },
            ].map((useCase) => (
              <Card key={useCase.title} className="p-6">
                <useCase.icon className="w-8 h-8 text-[var(--primary)] mb-4" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  {useCase.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {useCase.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Your Credential?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Connect your Bitcoin wallet and create your privacy-preserving
            credential in minutes.
          </p>
          <Button
            onClick={connect}
            isLoading={isConnecting}
            size="lg"
            variant="secondary"
            className="bg-white text-[var(--primary)] hover:bg-white/90"
          >
            <Wallet className="w-5 h-5" />
            Connect Wallet to Start
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[var(--border-light)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">ZK</span>
              </div>
              <span className="font-semibold text-lg text-[var(--text-primary)]">
                ZK<span className="text-[var(--primary)]">Cred</span>
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)]">
              <a
                href="https://github.com/your-repo/zkcred"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-[var(--text-primary)]"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <a
                href="https://starknet.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-[var(--text-primary)]"
              >
                <ExternalLink className="w-4 h-4" />
                Starknet
              </a>
            </div>

            <p className="text-sm text-[var(--text-muted)]">
              Built for RE:DEFINE Hackathon 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

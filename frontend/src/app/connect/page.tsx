"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    Bitcoin,
    Github,
    Gamepad2,
    Code2,
    Wallet,
    Activity,
    ArrowRight,
    Shield,
    Lock,
    CheckCircle,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";

type ConnectorStatus = "idle" | "connecting" | "verifying" | "success" | "error";

interface ConnectorConfig {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    borderColor: string;
    credentialType: string;
    tiers: { name: string; emoji: string; description: string }[];
    inputType: "wallet" | "username" | "address" | "oauth";
    inputPlaceholder?: string;
    inputLabel?: string;
    apiEndpoint: string;
    available: boolean;
}

const CONNECTORS: ConnectorConfig[] = [
    {
        id: "bitcoin",
        name: "Bitcoin",
        description: "Prove your BTC holdings tier without revealing your balance",
        icon: Bitcoin,
        color: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/20",
        credentialType: "btc_tier",
        tiers: [
            { name: "Shrimp", emoji: "🦐", description: "<1 BTC" },
            { name: "Crab", emoji: "🦀", description: "1-10 BTC" },
            { name: "Fish", emoji: "🐟", description: "10-100 BTC" },
            { name: "Whale", emoji: "🐋", description: "100+ BTC" },
        ],
        inputType: "wallet",
        apiEndpoint: "/api/credential/verified",
        available: true,
    },
    {
        id: "github",
        name: "GitHub",
        description: "Prove your developer tier from repos, stars & contributions",
        icon: Github,
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/20",
        credentialType: "github_dev",
        tiers: [
            { name: "Newbie", emoji: "🌱", description: "<5 repos" },
            { name: "Builder", emoji: "🔨", description: "5-20 repos" },
            { name: "Veteran", emoji: "⭐", description: "20-50 repos" },
            { name: "Elite", emoji: "🏆", description: "50+ repos" },
        ],
        inputType: "username",
        inputPlaceholder: "Enter GitHub username",
        inputLabel: "GitHub Username",
        apiEndpoint: "/api/credential/github",
        available: true,
    },
    {
        id: "leetcode",
        name: "LeetCode",
        description: "Prove your coding tier from problems solved & contest rating",
        icon: Code2,
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        credentialType: "leetcode_coder",
        tiers: [
            { name: "Beginner", emoji: "🌱", description: "<50 solved" },
            { name: "Solver", emoji: "🧩", description: "50-200 solved" },
            { name: "Expert", emoji: "🧠", description: "200-500 solved" },
            { name: "Guardian", emoji: "👑", description: "500+ solved" },
        ],
        inputType: "username",
        inputPlaceholder: "Enter LeetCode username",
        inputLabel: "LeetCode Username",
        apiEndpoint: "/api/credential/leetcode",
        available: true,
    },
    {
        id: "ethereum",
        name: "Ethereum",
        description: "Prove your ETH holdings tier without revealing your balance",
        icon: Wallet,
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        credentialType: "eth_holder",
        tiers: [
            { name: "Dust", emoji: "🫧", description: "<0.1 ETH" },
            { name: "Holder", emoji: "💎", description: "0.1-1 ETH" },
            { name: "Stacker", emoji: "🔷", description: "1-10 ETH" },
            { name: "Whale", emoji: "🐋", description: "10+ ETH" },
        ],
        inputType: "address",
        inputPlaceholder: "0x...",
        inputLabel: "ETH Address",
        apiEndpoint: "/api/credential/ethereum",
        available: true,
    },
    {
        id: "steam",
        name: "Steam",
        description: "Prove your gamer tier from games owned & total playtime",
        icon: Gamepad2,
        color: "text-sky-400",
        bgColor: "bg-sky-500/10",
        borderColor: "border-sky-500/20",
        credentialType: "steam_gamer",
        tiers: [
            { name: "Casual", emoji: "🎮", description: "<10 games" },
            { name: "Gamer", emoji: "🕹️", description: "10-50 games" },
            { name: "Hardcore", emoji: "🎯", description: "50-200 games" },
            { name: "Legend", emoji: "👾", description: "200+ games" },
        ],
        inputType: "username",
        inputPlaceholder: "Enter Steam ID",
        inputLabel: "Steam ID (64-bit)",
        apiEndpoint: "/api/credential/steam",
        available: true,
    },
    {
        id: "strava",
        name: "Strava",
        description: "Prove your athlete tier from total running distance",
        icon: Activity,
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        credentialType: "strava_athlete",
        tiers: [
            { name: "Starter", emoji: "🏃", description: "<50km" },
            { name: "Active", emoji: "💪", description: "50-500km" },
            { name: "Athlete", emoji: "🥇", description: "500-2000km" },
            { name: "Ultra", emoji: "🏔️", description: "2000+ km" },
        ],
        inputType: "oauth",
        apiEndpoint: "/api/credential/strava",
        available: false, // Stretch goal
    },
];

export default function ConnectPage() {
    return (
        <div className="flex-1 p-6 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] font-[var(--font-display)] mb-2">
                        Connect & Prove
                    </h1>
                    <p className="text-[var(--text-muted)] text-lg">
                        Connect your accounts and prove your tier — without revealing any personal data
                    </p>
                </div>

                {/* Privacy Banner */}
                <Card className="mb-8 p-4 border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5 text-[var(--accent-primary)]" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[var(--text-primary)] mb-1">Privacy-First Architecture</h3>
                            <p className="text-sm text-[var(--text-muted)]">
                                Your data is queried once server-side, never stored. Only a cryptographic commitment and tier level go on-chain.
                                Raw data (balances, profiles, stats) is immediately discarded after tier calculation.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Connector Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {CONNECTORS.map((connector) => (
                        <ConnectorCard key={connector.id} connector={connector} />
                    ))}
                </div>

                {/* Cryptography Info */}
                <Card className="mt-8 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Lock className="w-5 h-5 text-[var(--accent-primary)]" />
                        <h3 className="font-semibold text-[var(--text-primary)]">How It Works</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                            <div className="font-medium text-[var(--text-primary)] mb-1">1. Connect</div>
                            <p className="text-[var(--text-muted)]">
                                Authenticate via OAuth, username, or wallet signature to prove ownership
                            </p>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                            <div className="font-medium text-[var(--text-primary)] mb-1">2. Verify</div>
                            <p className="text-[var(--text-muted)]">
                                Server queries the API, determines your tier, and creates a Poseidon commitment
                            </p>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                            <div className="font-medium text-[var(--text-primary)] mb-1">3. Prove</div>
                            <p className="text-[var(--text-muted)]">
                                Commitment + tier stored on Starknet. Share your credential ID — anyone can verify
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

function ConnectorCard({ connector }: { connector: ConnectorConfig }) {
    const [status, setStatus] = useState<ConnectorStatus>("idle");
    const [input, setInput] = useState("");
    const [result, setResult] = useState<{
        tier: number;
        tierName: string;
        transactionHash?: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    const handleSubmit = async () => {
        if (!input.trim() && connector.inputType !== "wallet") return;

        setStatus("verifying");
        setError(null);
        setResult(null);

        try {
            const body: Record<string, string> = {};
            if (connector.id === "leetcode") body.username = input.trim();
            else if (connector.id === "ethereum") body.ethAddress = input.trim();
            else if (connector.id === "github") body.username = input.trim();
            else if (connector.id === "steam") body.steamId = input.trim();

            const res = await fetch(connector.apiEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (data.success) {
                setStatus("success");
                setResult({
                    tier: data.tier,
                    tierName: data.tierName,
                    transactionHash: data.transactionHash,
                });
            } else {
                setStatus("error");
                setError(data.error || "Verification failed");
            }
        } catch (err) {
            setStatus("error");
            setError(err instanceof Error ? err.message : "Network error");
        }
    };

    const Icon = connector.icon;

    return (
        <Card
            className={cn(
                "p-5 transition-all duration-200 cursor-pointer border",
                connector.borderColor,
                expanded ? "ring-1 ring-[var(--accent-primary)]" : "hover:border-[var(--border-medium)]"
            )}
            onClick={() => !expanded && connector.available && setExpanded(true)}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", connector.bgColor)}>
                        <Icon className={cn("w-5 h-5", connector.color)} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">{connector.name}</h3>
                        {!connector.available && (
                            <span className="text-xs px-2 py-0.5 bg-[var(--bg-secondary)] text-[var(--text-muted)] rounded-full">
                                Coming Soon
                            </span>
                        )}
                    </div>
                </div>
                {status === "success" && <CheckCircle className="w-5 h-5 text-green-400" />}
            </div>

            <p className="text-sm text-[var(--text-muted)] mb-3">
                {connector.description}
            </p>

            {/* Tiers */}
            <div className="flex gap-2 mb-4">
                {connector.tiers.map((tier, i) => (
                    <div
                        key={i}
                        className="text-center flex-1"
                        title={`${tier.name}: ${tier.description}`}
                    >
                        <div className="text-lg">{tier.emoji}</div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{tier.name}</div>
                    </div>
                ))}
            </div>

            {/* Expanded: Input Form */}
            {expanded && connector.available && status !== "success" && (
                <div className="mt-4 pt-4 border-t border-[var(--border-light)]" onClick={(e) => e.stopPropagation()}>
                    {connector.inputType !== "wallet" && connector.inputType !== "oauth" && (
                        <>
                            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">
                                {connector.inputLabel}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={connector.inputPlaceholder}
                                    className="flex-1 px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg
                    text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                    focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                                />
                                <Button
                                    onClick={handleSubmit}
                                    disabled={status === "verifying" || !input.trim()}
                                    className="px-4"
                                >
                                    {status === "verifying" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ArrowRight className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="mt-3 flex items-start gap-2 text-sm text-red-400">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Success Result */}
            {status === "success" && result && (
                <div className="mt-4 pt-4 border-t border-[var(--border-light)]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--text-muted)]">Your tier:</span>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{connector.tiers[result.tier]?.emoji}</span>
                            <span className="font-semibold text-[var(--text-primary)]">{result.tierName}</span>
                        </div>
                    </div>
                    {result.transactionHash && (
                        <a
                            href={`https://sepolia.starkscan.co/tx/${result.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--accent-primary)] hover:underline block mt-1"
                        >
                            View on Starkscan →
                        </a>
                    )}
                </div>
            )}

            {/* CTA for non-expanded cards */}
            {!expanded && connector.available && (
                <Button variant="secondary" className="w-full mt-2">
                    Connect
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
            )}
        </Card>
    );
}

"use client";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
import { toast } from "sonner";
import { useAppStore } from "@/stores/useAppStore";
import { useBtcWallet } from "@/hooks/useBtcWallet";
import type { CredentialType, Tier } from "@/types/credential";
import { getOpenIDUrl } from "@/lib/connectors/steam";
import { getAuthUrl as getStravaAuthUrl } from "@/lib/connectors/strava";

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
            { name: "Seedling", emoji: "🌱", description: "<5 repos" },
            { name: "Hammer", emoji: "🔨", description: "5-20 repos" },
            { name: "Star", emoji: "⭐", description: "20-50 repos" },
            { name: "Trophy", emoji: "🏆", description: "50+ repos" },
        ],
        inputType: "oauth",
        apiEndpoint: "/api/credential/github",
        available: true,
    },
    {
        id: "codeforces",
        name: "Codeforces",
        description: "Prove your competitive programming tier from your Codeforces rating",
        icon: Code2,
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        credentialType: "codeforces_coder",
        tiers: [
            { name: "Newbie", emoji: "🌱", description: "< 1200 rating" },
            { name: "Specialist", emoji: "🧩", description: "1200-1599" },
            { name: "Expert", emoji: "🧠", description: "1600-1999" },
            { name: "Master", emoji: "👑", description: "2000+" },
        ],
        inputType: "oauth",
        apiEndpoint: "/api/credential/codeforces",
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
        inputType: "wallet",
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
        inputType: "oauth",
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
        available: true,
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
    const searchParams = useSearchParams();
    const btcWallet = useBtcWallet();
    const globalBtcState = useAppStore((s) => s.btcWallet);
    const addCredential = useAppStore((s) => s.addCredential);
    const existingCredentials = useAppStore((s) => s.credentials);
    const [status, setStatus] = useState<ConnectorStatus>("idle");
    const [input, setInput] = useState("");
    const [result, setResult] = useState<{
        tier: number;
        tierName: string;
        transactionHash?: string;
        credentialId?: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [ethAddress, setEthAddress] = useState<string | null>(null);
    const [localBtcConnected, setLocalBtcConnected] = useState<{ address: string; pubkey: string } | null>(null);

    // Derive BTC connected state from local (connect button) or global (persisted wallet)
    const btcConnected = localBtcConnected ?? (
        connector.id === "bitcoin" && globalBtcState.status === "connected" && globalBtcState.address && globalBtcState.pubkey
            ? { address: globalBtcState.address, pubkey: globalBtcState.pubkey }
            : null
    );

    // Check if credential already exists in local store
    const alreadyIssued = existingCredentials.some((c) => c.credentialType === connector.credentialType);

    // Auto-expand after OAuth callback redirect
    const returnedFromOAuth =
        (connector.id === "codeforces" && searchParams.get("codeforces_success") === "true") ||
        (connector.id === "github" && searchParams.get("github_success") === "true") ||
        (connector.id === "steam" && searchParams.get("steam_success") === "true") ||
        (connector.id === "strava" && searchParams.get("strava_success") === "true");
    const expanded = true;

    useEffect(() => {
        if (returnedFromOAuth) {
            toast.success(`${connector.name} authenticated — click Issue Credential below`);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveCredential = (data: { credentialId?: string; tier: number; tierName: string }) => {
        if (!data.credentialId) return;
        const credType = connector.credentialType as CredentialType;
        const alreadyExists = existingCredentials.some((c) => c.credentialType === credType);
        if (alreadyExists) return;
        addCredential({
            id: data.credentialId,
            pubkeyHash: "",
            credentialType: credType,
            tier: data.tier as Tier,
            issuedAt: new Date().toISOString(),
            revoked: false,
        });
    };

    const handleDuplicateRecovery = (status: number) => {
        if (status === 409) {
            const credType = connector.credentialType as CredentialType;
            saveCredential({ credentialId: `recovered:${credType}`, tier: 0, tierName: "Issued" });
            setStatus("success");
            setResult({ tier: -1, tierName: "Already issued" });
            toast.info("Credential already issued — recovered from chain");
            return true;
        }
        return false;
    };

    const handleEthConnect = async () => {
        if (typeof window === "undefined" || !window.ethereum) {
            setError("MetaMask not installed");
            return;
        }
        setStatus("connecting");
        setError(null);
        try {
            const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
            if (accounts?.length) {
                setEthAddress(accounts[0]);
                // Check if credential already exists on-chain
                try {
                    const lookupRes = await fetch(`${BASE_PATH}/api/credential/lookup`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ identifier: accounts[0], credentialType: connector.credentialType }),
                    });
                    const lookupData = await lookupRes.json();
                    if (lookupData.exists) {
                        const credType = connector.credentialType as CredentialType;
                        saveCredential({ credentialId: `recovered:${credType}`, tier: 0, tierName: "Issued" });
                        setStatus("success");
                        setResult({ tier: -1, tierName: "Already issued" });
                        toast.info("Credential already issued for this wallet");
                        return;
                    }
                } catch { /* lookup failed — continue with normal flow */ }
                toast.success("Wallet connected — click Sign & Verify to issue credential");
                setStatus("idle");
            }
        } catch (err) {
            setStatus("error");
            setError(err instanceof Error ? err.message : "Wallet connection failed");
        }
    };

    const handleEthVerify = async () => {
        if (!ethAddress) return;
        setStatus("verifying");
        setError(null);
        setResult(null);
        try {
            const message = `ZKCred: Verify ETH wallet\nAddress: ${ethAddress}\nTimestamp: ${Date.now()}`;
            const signature = (await window.ethereum!.request({
                method: "personal_sign",
                params: [message, ethAddress],
            })) as string;

            const res = await fetch(`${BASE_PATH}${connector.apiEndpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ethAddress, signature, message }),
            });
            const data = await res.json();
            if (data.success) {
                setStatus("success");
                setResult({ tier: data.tier, tierName: data.tierName, transactionHash: data.transactionHash, credentialId: data.credentialId });
                saveCredential(data);
                toast.success(`Credential issued! Tier: ${data.tierName}`);
            } else if (!handleDuplicateRecovery(res.status)) {
                setStatus("error");
                setError(data.error || "Verification failed");
                toast.error(data.error || "Verification failed");
            }
        } catch (err) {
            setStatus("error");
            setError(err instanceof Error ? err.message : "Signing failed");
            toast.error("Signing failed");
        }
    };

    const handleBtcConnect = async () => {
        setStatus("connecting");
        setError(null);
        try {
            const result = await btcWallet.connect();
            setLocalBtcConnected({ address: result.address, pubkey: result.pubkey });
            // Check if credential already exists on-chain
            try {
                const lookupRes = await fetch(`${BASE_PATH}/api/credential/lookup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identifier: result.pubkey, credentialType: connector.credentialType }),
                });
                const lookupData = await lookupRes.json();
                if (lookupData.exists) {
                    const credType = connector.credentialType as CredentialType;
                    saveCredential({ credentialId: `recovered:${credType}`, tier: 0, tierName: "Issued" });
                    setStatus("success");
                    setResult({ tier: -1, tierName: "Already issued" });
                    toast.info("Credential already issued for this wallet");
                    return;
                }
            } catch { /* lookup failed — continue with normal flow */ }
            toast.success("Wallet connected — click Sign & Verify to issue credential");
            setStatus("idle");
        } catch (err) {
            setStatus("error");
            setError(err instanceof Error ? err.message : "Wallet connection failed");
            toast.error("Wallet connection failed");
        }
    };

    const handleBtcVerify = async () => {
        if (!btcConnected) return;
        setStatus("verifying");
        setError(null);
        setResult(null);
        try {
            const message = `ZKCred Credential Request\nType: btc_tier\nAddress: ${btcConnected.address}\nTimestamp: ${Date.now()}`;
            const signature = await btcWallet.signMessage(message);

            const res = await fetch(`${BASE_PATH}${connector.apiEndpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    btcAddress: btcConnected.address,
                    btcPubkey: btcConnected.pubkey,
                    signature,
                    message,
                    credentialType: "btc_tier",
                }),
            });
            const data = await res.json();
            if (data.success) {
                setStatus("success");
                setResult({ tier: data.tier, tierName: data.tierName, transactionHash: data.transactionHash, credentialId: data.credentialId });
                saveCredential(data);
                toast.success(`Credential issued! Tier: ${data.tierName}`);
            } else if (!handleDuplicateRecovery(res.status)) {
                setStatus("error");
                setError(data.error || "Verification failed");
                toast.error(data.error || "Verification failed");
            }
        } catch (err) {
            setStatus("error");
            setError(err instanceof Error ? err.message : "Signing failed");
            toast.error("Signing failed");
        }
    };

    const handleOAuthRedirect = (provider: string) => {
        if (provider === "codeforces") {
            const clientId = process.env.NEXT_PUBLIC_CODEFORCES_CLIENT_ID;
            if (!clientId) {
                setError("Codeforces OIDC not configured");
                return;
            }
            const state = Math.random().toString(36).slice(2);
            document.cookie = `cf_oauth_state=${state};path=/;max-age=300;samesite=lax`;
            const redirectUri = `${window.location.origin}${BASE_PATH}/api/auth/codeforces/callback`;
            window.location.href = `https://codeforces.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid&state=${state}`;
        } else if (provider === "github") {
            const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
            if (!clientId) {
                setError("GitHub OAuth not configured");
                return;
            }
            const state = Math.random().toString(36).slice(2);
            document.cookie = `gh_oauth_state=${state};path=/;max-age=300;samesite=lax`;
            const redirectUri = `${window.location.origin}${BASE_PATH}/api/auth/github/callback`;
            window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user&state=${state}`;
        } else if (provider === "steam") {
            const returnUrl = `${window.location.origin}${BASE_PATH}/api/auth/steam/callback`;
            window.location.href = getOpenIDUrl(returnUrl);
        } else if (provider === "strava") {
            const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
            if (!clientId) {
                setError("Strava OAuth not configured");
                return;
            }
            const state = Math.random().toString(36).slice(2);
            document.cookie = `strava_oauth_state=${state};path=/;max-age=300;samesite=lax`;
            const redirectUri = `${window.location.origin}${BASE_PATH}/api/auth/strava/callback`;
            window.location.href = getStravaAuthUrl(clientId, redirectUri, state);
        }
    };

    const handleSubmit = async () => {
        if (connector.inputType === "oauth") {
            // For OAuth connectors (codeforces, strava), first check if we returned from callback
            setStatus("verifying");
            setError(null);
            setResult(null);
            try {
                const res = await fetch(`${BASE_PATH}${connector.apiEndpoint}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                });
                const data = await res.json();
                if (data.success) {
                    setStatus("success");
                    setResult({ tier: data.tier, tierName: data.tierName, transactionHash: data.transactionHash, credentialId: data.credentialId });
                    saveCredential(data);
                    toast.success(`Credential issued! Tier: ${data.tierName}`);
                } else if (!handleDuplicateRecovery(res.status)) {
                    setStatus("error");
                    setError(data.error || "Verification failed");
                    toast.error(data.error || "Verification failed");
                }
            } catch (err) {
                setStatus("error");
                setError(err instanceof Error ? err.message : "Network error");
                toast.error("Network error");
            }
            return;
        }

        if (!input.trim() && connector.inputType !== "wallet") return;

        setStatus("verifying");
        setError(null);
        setResult(null);

        try {
            const body: Record<string, string> = {};

            const res = await fetch(`${BASE_PATH}${connector.apiEndpoint}`, {
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
                    credentialId: data.credentialId,
                });
                saveCredential(data);
                toast.success(`Credential issued! Tier: ${data.tierName}`);
            } else if (!handleDuplicateRecovery(res.status)) {
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
                "p-5 transition-all duration-200 border flex flex-col",
                connector.borderColor,
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", connector.bgColor)}>
                        <Icon className={cn("w-5 h-5", connector.color)} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">{connector.name}</h3>
                    </div>
                </div>
                {(status === "success" || alreadyIssued) && <CheckCircle className="w-5 h-5 text-green-400" />}
            </div>

            <p className="text-sm text-[var(--text-muted)] mb-3 flex-1">
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

            {/* Already Issued State */}
            {alreadyIssued && status !== "success" && (
                <div className="mt-4 pt-4 border-t border-[var(--border-light)]">
                    <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Credential already issued</span>
                    </div>
                </div>
            )}

            {/* Expanded: Input Form */}
            {expanded && connector.available && status !== "success" && !alreadyIssued && (
                <div className="mt-4 pt-4 border-t border-[var(--border-light)]" onClick={(e) => e.stopPropagation()}>
                    {/* Address / Username input connectors */}
                    {(connector.inputType === "username" || connector.inputType === "address") && (
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

                    {/* BTC Wallet: connect via Xverse → sign → verify */}
                    {connector.inputType === "wallet" && connector.id === "bitcoin" && (
                        <div className="space-y-3">
                            {!btcConnected ? (
                                <Button
                                    onClick={handleBtcConnect}
                                    disabled={status === "connecting"}
                                    className="w-full"
                                >
                                    {status === "connecting" ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Bitcoin className="w-4 h-4 mr-2" />
                                    )}
                                    Connect with Xverse
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        onClick={handleBtcVerify}
                                        disabled={status === "verifying"}
                                        className="w-full"
                                    >
                                        {status === "verifying" ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Shield className="w-4 h-4 mr-2" />
                                        )}
                                        Sign & Verify
                                    </Button>
                                    <p className="text-xs text-[var(--text-muted)] font-mono truncate">
                                        {btcConnected.address}
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* ETH Wallet: connect MetaMask → sign → verify */}
                    {connector.inputType === "wallet" && connector.id === "ethereum" && (
                        <div className="space-y-3">
                            {!ethAddress ? (
                                <Button
                                    onClick={handleEthConnect}
                                    disabled={status === "connecting"}
                                    className="w-full"
                                >
                                    {status === "connecting" ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Wallet className="w-4 h-4 mr-2" />
                                    )}
                                    Connect MetaMask
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        onClick={handleEthVerify}
                                        disabled={status === "verifying"}
                                        className="w-full"
                                    >
                                        {status === "verifying" ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Shield className="w-4 h-4 mr-2" />
                                        )}
                                        Sign & Verify
                                    </Button>
                                    <p className="text-xs text-[var(--text-muted)] font-mono truncate">
                                        {ethAddress}
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* OAuth connectors: redirect to provider */}
                    {connector.inputType === "oauth" && (
                        <div className="space-y-3">
                            {connector.id === "codeforces" && !returnedFromOAuth && (
                                <>
                                    <Button
                                        onClick={() => handleOAuthRedirect("codeforces")}
                                        disabled={status === "verifying"}
                                        className="w-full"
                                    >
                                        <Code2 className="w-4 h-4 mr-2" />
                                        Login with Codeforces
                                    </Button>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Redirects to Codeforces for OIDC authentication
                                    </p>
                                </>
                            )}
                            {connector.id === "github" && !returnedFromOAuth && (
                                <>
                                    <Button
                                        onClick={() => handleOAuthRedirect("github")}
                                        disabled={status === "verifying"}
                                        className="w-full"
                                    >
                                        <Github className="w-4 h-4 mr-2" />
                                        Login with GitHub
                                    </Button>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Redirects to GitHub for OAuth authentication
                                    </p>
                                </>
                            )}
                            {connector.id === "steam" && !returnedFromOAuth && (
                                <>
                                    <Button
                                        onClick={() => handleOAuthRedirect("steam")}
                                        disabled={status === "verifying"}
                                        className="w-full"
                                    >
                                        <Gamepad2 className="w-4 h-4 mr-2" />
                                        Login with Steam
                                    </Button>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Redirects to Steam for OpenID authentication
                                    </p>
                                </>
                            )}
                            {connector.id === "strava" && !returnedFromOAuth && (
                                <>
                                    <Button
                                        onClick={() => handleOAuthRedirect("strava")}
                                        disabled={status === "verifying"}
                                        className="w-full"
                                    >
                                        <Activity className="w-4 h-4 mr-2" />
                                        Login with Strava
                                    </Button>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Redirects to Strava for OAuth authentication
                                    </p>
                                </>
                            )}
                            {/* After returning from OAuth callback, show "Issue Credential" button */}
                            {returnedFromOAuth && (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={status === "verifying"}
                                    className="w-full animate-pulse"
                                >
                                    {status === "verifying" ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Shield className="w-4 h-4 mr-2" />
                                    )}
                                    Issue Credential
                                </Button>
                            )}
                        </div>
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
                    {result.tier >= 0 ? (
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[var(--text-muted)]">Your tier:</span>
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{connector.tiers[result.tier]?.emoji}</span>
                                <span className="font-semibold text-[var(--text-primary)]">{result.tierName}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-green-400 mb-2">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <span>Credential already issued</span>
                        </div>
                    )}
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

        </Card>
    );
}

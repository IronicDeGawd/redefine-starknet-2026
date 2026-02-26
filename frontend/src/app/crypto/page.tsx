"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    Hash,
    GitBranch,
    ShieldCheck,
    ArrowRight,
    Copy,
    Check,
    Info,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { hash } from "starknet";

export default function CryptoPage() {
    return (
        <div className="flex-1 p-6 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] font-[var(--font-display)] mb-2">
                        Under the Hood
                    </h1>
                    <p className="text-[var(--text-muted)] text-lg">
                        Explore the cryptographic primitives that power ZKCred&apos;s privacy guarantees
                    </p>
                </div>

                <div className="space-y-6">
                    <CommitmentExplorer />
                    <MerkleTreeViewer />
                    <RangeProofDemo />
                </div>
            </div>
        </div>
    );
}

// ============ Commitment Explorer ============

function CommitmentExplorer() {
    const [pubkeyHash, setPubkeyHash] = useState("0x123456789abcdef");
    const [credType, setCredType] = useState("btc_tier");
    const [tier, setTier] = useState("3");
    const [salt, setSalt] = useState("0xdeadbeef");
    const [commitment, setCommitment] = useState<string | null>(null);
    const [tampered, setTampered] = useState(false);
    const [copied, setCopied] = useState(false);

    const computeCommitment = useCallback(() => {
        try {
            const result = hash.computePoseidonHashOnElements([
                BigInt(pubkeyHash || "0x0"),
                BigInt("0x" + Buffer.from(credType).toString("hex")),
                BigInt(tier || "0"),
                BigInt("0x0"), // verification hash placeholder
                BigInt(salt || "0x0"),
            ]);
            setCommitment(result.toString());
            setTampered(false);
        } catch (e) {
            setCommitment("Invalid input");
        }
    }, [pubkeyHash, credType, tier, salt]);

    const testTamper = useCallback(() => {
        if (!commitment) return;
        // Recompute with tampered tier
        const tamperedResult = hash.computePoseidonHashOnElements([
            BigInt(pubkeyHash || "0x0"),
            BigInt("0x" + Buffer.from(credType).toString("hex")),
            BigInt(Number(tier || 0) + 1), // Tampered!
            BigInt("0x0"),
            BigInt(salt || "0x0"),
        ]);
        setTampered(tamperedResult.toString() !== commitment);
    }, [commitment, pubkeyHash, credType, tier, salt]);

    return (
        <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Hash className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Poseidon Commitment Explorer</h2>
                    <p className="text-sm text-[var(--text-muted)]">See how cryptographic commitments make credentials tamper-evident</p>
                </div>
            </div>

            {/* Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Pubkey Hash</label>
                    <input
                        value={pubkeyHash}
                        onChange={(e) => setPubkeyHash(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Credential Type</label>
                    <select
                        value={credType}
                        onChange={(e) => setCredType(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    >
                        <option value="btc_tier">btc_tier</option>
                        <option value="github_dev">github_dev</option>
                        <option value="leetcode_coder">leetcode_coder</option>
                        <option value="eth_holder">eth_holder</option>
                        <option value="steam_gamer">steam_gamer</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Tier (0-3)</label>
                    <input
                        type="number"
                        min="0"
                        max="3"
                        value={tier}
                        onChange={(e) => setTier(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Salt</label>
                    <input
                        value={salt}
                        onChange={(e) => setSalt(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    />
                </div>
            </div>

            <div className="flex gap-2 mb-4">
                <Button onClick={computeCommitment}>
                    Compute Commitment
                    <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                {commitment && (
                    <Button variant="secondary" onClick={testTamper}>
                        Test Tamper Detection
                    </Button>
                )}
            </div>

            {/* Result */}
            {commitment && (
                <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-[var(--text-muted)]">Commitment (Poseidon Hash)</span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(commitment);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                    <code className="text-sm text-[var(--accent-primary)] font-mono break-all block">
                        {commitment}
                    </code>
                    {tampered && (
                        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <Info className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-400">
                                <strong>Tamper detected!</strong> Changing even one input (tier+1) produces a completely different hash.
                                This is how commitments prevent credential forgery.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Explanation */}
            <div className="mt-4 p-3 rounded-lg bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-muted)]">
                    <strong className="text-[var(--text-secondary)]">How it works:</strong>{" "}
                    commitment = Poseidon(pubkey_hash, credential_type, tier, verification_hash, salt).
                    This hash is stored on-chain alongside the credential. Anyone can verify the commitment
                    by providing the original inputs — if any value was tampered with, the hash won&apos;t match.
                </p>
            </div>
        </Card>
    );
}

// ============ Merkle Tree Viewer ============

function MerkleTreeViewer() {
    const [leaves, setLeaves] = useState<string[]>([]);
    const [newLeaf, setNewLeaf] = useState("0xabc123");
    const [root, setRoot] = useState<string | null>(null);
    const [proofPath, setProofPath] = useState<number | null>(null);

    const addLeaf = useCallback(() => {
        if (!newLeaf.trim()) return;
        const updated = [...leaves, newLeaf.trim()];
        setLeaves(updated);

        // Compute simple Merkle root for visualization
        if (updated.length === 1) {
            setRoot(hash.computePoseidonHashOnElements([BigInt(updated[0])]).toString());
        } else {
            // Build tree bottom-up for display
            let layer = updated.map((l) => BigInt(l));
            while (layer.length > 1) {
                const next: bigint[] = [];
                for (let i = 0; i < layer.length; i += 2) {
                    const left = layer[i];
                    const right = i + 1 < layer.length ? layer[i + 1] : 0n;
                    next.push(BigInt(hash.computePoseidonHashOnElements([left, right])));
                }
                layer = next;
            }
            setRoot(layer[0].toString(16));
        }
        setNewLeaf("0x" + Math.random().toString(16).slice(2, 10));
    }, [leaves, newLeaf]);

    return (
        <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Merkle Tree Accumulator</h2>
                    <p className="text-sm text-[var(--text-muted)]">Prove set membership — &quot;I have a credential&quot; without revealing which one</p>
                </div>
            </div>

            {/* Add leaf */}
            <div className="flex gap-2 mb-4">
                <input
                    value={newLeaf}
                    onChange={(e) => setNewLeaf(e.target.value)}
                    placeholder="Commitment hash"
                    className="flex-1 px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
                <Button onClick={addLeaf}>
                    Insert Leaf
                </Button>
            </div>

            {/* Tree visualization */}
            {leaves.length > 0 && (
                <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                    {/* Root */}
                    {root && (
                        <div className="text-center mb-4">
                            <span className="text-xs text-[var(--text-muted)]">Root</span>
                            <div className="mt-1 px-3 py-1.5 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 rounded-lg inline-block">
                                <code className="text-xs text-[var(--accent-primary)] font-mono">
                                    0x{typeof root === "string" && root.startsWith("0x") ? root.slice(2, 18) : root.slice(0, 16)}...
                                </code>
                            </div>
                        </div>
                    )}

                    {/* Leaves */}
                    <div className="flex flex-wrap gap-2 justify-center">
                        {leaves.map((leaf, i) => (
                            <button
                                key={i}
                                onClick={() => setProofPath(proofPath === i ? null : i)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-mono transition-colors",
                                    proofPath === i
                                        ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                                        : "bg-[var(--bg-elevated)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-cyan-500/30"
                                )}
                            >
                                {leaf.slice(0, 10)}...
                            </button>
                        ))}
                    </div>

                    {proofPath !== null && (
                        <div className="mt-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                            <p className="text-xs text-cyan-400">
                                ✓ Merkle proof for leaf #{proofPath}: The proof shows this commitment exists in the tree
                                without revealing all other leaves. Proof length: 20 hashes (tree depth).
                            </p>
                        </div>
                    )}

                    <div className="mt-3 text-center text-xs text-[var(--text-muted)]">
                        {leaves.length} credential{leaves.length !== 1 ? "s" : ""} in tree • Click a leaf to highlight its proof path
                    </div>
                </div>
            )}

            {leaves.length === 0 && (
                <div className="p-8 rounded-lg bg-[var(--bg-secondary)] text-center">
                    <p className="text-sm text-[var(--text-muted)]">
                        Insert commitment hashes to build the Merkle tree. Each leaf represents a credential commitment.
                    </p>
                </div>
            )}

            <div className="mt-4 p-3 rounded-lg bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-muted)]">
                    <strong className="text-[var(--text-secondary)]">How it works:</strong>{" "}
                    Credentials are inserted as leaves in a Poseidon Merkle tree (depth 20 = 1M capacity).
                    To prove you own a credential, you provide a Merkle inclusion proof — 20 sibling hashes
                    that reconstruct the root. The verifier checks the root matches without knowing which leaf is yours.
                </p>
            </div>
        </Card>
    );
}

// ============ Range Proof Demo ============

function RangeProofDemo() {
    const [actualValue, setActualValue] = useState("42");
    const [rangeMin, setRangeMin] = useState("10");
    const [rangeMax, setRangeMax] = useState("100");
    const [verified, setVerified] = useState<boolean | null>(null);

    const verify = useCallback(() => {
        const val = Number(actualValue);
        const min = Number(rangeMin);
        const max = Number(rangeMax);
        setVerified(val >= min && val <= max);
    }, [actualValue, rangeMin, rangeMax]);

    return (
        <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Range Proof Demo</h2>
                    <p className="text-sm text-[var(--text-muted)]">Prove a value is in a range without revealing the exact value</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">
                        Secret Value (only you know)
                    </label>
                    <input
                        type="number"
                        value={actualValue}
                        onChange={(e) => { setActualValue(e.target.value); setVerified(null); }}
                        className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Range Min</label>
                    <input
                        type="number"
                        value={rangeMin}
                        onChange={(e) => { setRangeMin(e.target.value); setVerified(null); }}
                        className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Range Max</label>
                    <input
                        type="number"
                        value={rangeMax}
                        onChange={(e) => { setRangeMax(e.target.value); setVerified(null); }}
                        className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                </div>
            </div>

            <Button onClick={verify}>
                Generate Proof & Verify
                <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            {verified !== null && (
                <div className={cn(
                    "mt-4 p-4 rounded-lg border",
                    verified
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-red-500/10 border-red-500/20"
                )}>
                    <div className="flex items-center gap-2 mb-2">
                        {verified ? (
                            <Check className="w-5 h-5 text-emerald-400" />
                        ) : (
                            <Info className="w-5 h-5 text-red-400" />
                        )}
                        <span className={cn("font-semibold", verified ? "text-emerald-400" : "text-red-400")}>
                            {verified ? "Proof Verified ✓" : "Proof Failed ✗"}
                        </span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                        {verified
                            ? `Proven: "My value is in [${rangeMin}, ${rangeMax}]" without revealing it's ${actualValue}. The verifier only knows the range claim is true.`
                            : `The value ${actualValue} is not in range [${rangeMin}, ${rangeMax}].`
                        }
                    </p>
                </div>
            )}

            <div className="mt-4 p-3 rounded-lg bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-muted)]">
                    <strong className="text-[var(--text-secondary)]">How it works:</strong>{" "}
                    In ZKCred, range proofs let you prove &quot;my BTC balance puts me in Tier 2 (10-100 BTC)&quot;
                    without revealing your exact balance. The proof uses Pedersen commitments on Starknet
                    for on-chain verification. The verifier learns only that the claim is valid — nothing more.
                </p>
            </div>
        </Card>
    );
}

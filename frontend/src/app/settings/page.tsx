"use client";

import { useBtcWallet } from "@/hooks/useBtcWallet";
import { useAppStore } from "@/stores/useAppStore";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Wallet, Trash2, ExternalLink, Github, Twitter, Globe, Shield } from "lucide-react";

export default function SettingsPage() {
  const { isConnected, address, connect, disconnect, isConnecting } = useBtcWallet();
  const { credentials, clearMessages } = useAppStore();

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] font-[var(--font-display)] mb-1">
            Settings
          </h1>
          <p className="text-[var(--text-muted)]">Manage your wallet and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Wallet Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                  <span className="text-white font-bold">₿</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    Bitcoin Wallet
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    {isConnected ? "Connected via Xverse" : "Not connected"}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isConnected && address ? (
                <div className="space-y-4">
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Address</p>
                    <p className="font-mono text-sm text-[var(--text-primary)] break-all">
                      {address}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        window.open(`https://mempool.space/address/${address}`, "_blank")
                      }
                      className="flex-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on Mempool
                    </Button>
                    <Button variant="danger" onClick={disconnect}>
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={connect} isLoading={isConnecting} className="w-full">
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Data Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    Local Data
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Stored in your browser
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Credentials</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {credentials.length} credential{credentials.length !== 1 ? "s" : ""} stored
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Chat History</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Conversations with ZKCred AI
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearMessages}>
                    <Trash2 className="w-4 h-4" />
                    Clear
                  </Button>
                </div>

                <p className="text-xs text-[var(--text-subtle)]">
                  Your data is stored locally in your browser. Clearing browser data will remove
                  your credential records (the credentials themselves remain valid on Starknet).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Network Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Network</h2>
                  <p className="text-sm text-[var(--text-muted)]">Starknet Sepolia Testnet</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Connected</span>
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  All credentials are issued on Starknet Sepolia testnet. Mainnet support coming
                  soon.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* About Section */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">About ZKCred</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                ZKCred enables Bitcoin holders to create privacy-preserving credentials on
                Starknet. Prove your holdings tier without revealing your wallet address or exact
                balance.
              </p>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Built for the RE{"{DEFINE}"} Hackathon 2026.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open("https://github.com/", "_blank")}
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open("https://twitter.com/", "_blank")}
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

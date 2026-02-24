"use client";

import { useBtcWallet } from "@/hooks/useBtcWallet";
import { Button } from "@/components/ui/Button";
import { Wallet, ChevronDown, ExternalLink } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { isConnected, isConnecting, address, connect, disconnect } = useBtcWallet();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="h-16 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] sticky top-0 z-30">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left side - Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[var(--text-primary)] font-[var(--font-display)]">
            ZKCred
          </h1>
          <span className="px-2 py-0.5 text-xs font-medium bg-[var(--accent-subtle)] text-[var(--accent-secondary)] rounded-full">
            Beta
          </span>
        </div>

        {/* Right side - Wallet */}
        <div className="flex items-center gap-4">
          {/* Network indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm text-[var(--text-secondary)]">Sepolia</span>
          </div>

          {/* Wallet button */}
          {isConnected && address ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all duration-200"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">₿</span>
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {truncateAddress(address)}
                </span>
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
              </button>

              {/* Dropdown */}
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] shadow-xl z-20 overflow-hidden">
                    <div className="p-3 border-b border-[var(--border-subtle)]">
                      <p className="text-xs text-[var(--text-muted)] mb-1">Connected Wallet</p>
                      <p className="text-sm font-mono text-[var(--text-primary)] break-all">
                        {address}
                      </p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          window.open(`https://mempool.space/address/${address}`, "_blank");
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View on Mempool
                      </button>
                      <button
                        onClick={() => {
                          disconnect();
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Button
              onClick={connect}
              isLoading={isConnecting}
              className="gap-2"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

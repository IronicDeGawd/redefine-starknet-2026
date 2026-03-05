"use client";

import { useBtcWallet } from "@/hooks/useBtcWallet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Wallet, ChevronDown, ExternalLink, Settings, Search } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { isConnected, isConnecting, address, connect, disconnect } = useBtcWallet();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="h-20 bg-[var(--background-secondary)] sticky top-0 z-30">
      <div className="h-full px-6 flex items-center justify-between gap-6">
        {/* Left side - Search */}
        <div className="flex-1 max-w-md">
          <Input
            variant="filled"
            icon={<Search className="w-5 h-5" />}
            placeholder="Search anything"
            className="bg-white"
          />
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-4">
          {/* Settings */}
          <Link
            href="/settings"
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--grey-200)] transition-colors"
          >
            <Settings className="w-5 h-5 text-[var(--text-secondary)]" />
          </Link>

          {/* Wallet button */}
          {isConnected && address ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 pl-1 pr-3 py-1 bg-white hover:bg-[var(--grey-100)] rounded-full border border-[var(--border)] transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
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
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-dropdown)] z-20 overflow-hidden">
                    <div className="p-4 border-b border-[var(--border-light)]">
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
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--grey-100)] rounded-xl transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View on Mempool
                      </button>
                      <button
                        onClick={() => {
                          disconnect();
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--error)] hover:bg-[var(--error-light)] rounded-xl transition-colors"
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
              size="md"
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

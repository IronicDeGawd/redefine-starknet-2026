"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  Home,
  ArrowLeftRight,
  Wallet,
  BarChart3,
  BadgeCheck,
  Shield,
  Settings,
  LogOut
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/credentials", label: "Credentials", icon: BadgeCheck },
  { href: "/verify", label: "Verify", icon: Shield },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/exchange", label: "Exchange", icon: ArrowLeftRight },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-[247px] h-screen bg-white border-r border-[var(--border-light)] fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-[var(--border-light)]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">ZK</span>
          </div>
          <span className="font-semibold text-lg text-[var(--text-primary)]">
            ZK<span className="text-[var(--primary)]">Cred</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col px-4 py-6 gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200",
                isActive
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-[var(--grey-100)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section - Logout */}
      <div className="p-4 border-t border-[var(--border-light)]">
        <button
          className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-[var(--error)] hover:bg-[var(--error-light)] w-full transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

// Collapsed sidebar for tablet view
export function SidebarCollapsed() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:hidden md:flex flex-col w-[80px] h-screen bg-white border-r border-[var(--border-light)] fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="h-20 flex items-center justify-center border-b border-[var(--border-light)]">
        <Link href="/">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">ZK</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center py-6 gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-[var(--grey-100)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="w-5 h-5" />

              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[var(--grey-800)] text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg z-50">
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-[var(--border-light)] flex justify-center">
        <button
          className="w-12 h-12 flex items-center justify-center rounded-xl text-[var(--error)] hover:bg-[var(--error-light)] transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}

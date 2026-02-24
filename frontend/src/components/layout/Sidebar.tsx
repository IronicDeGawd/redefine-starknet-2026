"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { MessageSquare, BadgeCheck, Shield, Settings } from "lucide-react";

const navItems = [
  { href: "/", label: "Chat", icon: MessageSquare },
  { href: "/credentials", label: "Credentials", icon: BadgeCheck },
  { href: "/verify", label: "Verify", icon: Shield },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-[72px] h-screen bg-[var(--bg-primary)] border-r border-[var(--border-subtle)] fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-[var(--border-subtle)]">
        <Link href="/" className="group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-cyan-500 flex items-center justify-center shadow-lg group-hover:shadow-[0_0_20px_var(--accent-glow)] transition-shadow duration-300">
            <span className="text-white font-bold text-lg font-[var(--font-display)]">Z</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center py-4 gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                `
                relative
                w-12 h-12
                flex items-center justify-center
                rounded-xl
                transition-all duration-200
                group
              `,
                isActive
                  ? "bg-[var(--accent-subtle)] text-[var(--accent-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 w-1 h-6 bg-[var(--accent-primary)] rounded-r-full" />
              )}

              <Icon className="w-5 h-5" />

              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-2 py-1 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg border border-[var(--border-default)]">
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-[var(--border-subtle)]">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)]">
          <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
        </div>
      </div>
    </aside>
  );
}

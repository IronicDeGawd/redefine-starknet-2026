"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { MessageSquare, BadgeCheck, Shield, Settings } from "lucide-react";

const navItems = [
  { href: "/", label: "Chat", icon: MessageSquare },
  { href: "/credentials", label: "Creds", icon: BadgeCheck },
  { href: "/verify", label: "Verify", icon: Shield },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-lg border-t border-[var(--border-light)] z-40 pb-safe">
      <div className="h-full flex items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200",
                isActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--text-muted)] active:text-[var(--text-primary)] active:bg-[var(--grey-100)]"
              )}
            >
              <div className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl transition-colors",
                isActive && "bg-[var(--primary-light)]"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

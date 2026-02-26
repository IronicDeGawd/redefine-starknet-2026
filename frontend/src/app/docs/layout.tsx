"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Zap,
  Cog,
  Shield,
  Code,
  FileText,
  AlertCircle,
  Timer,
  Layers,
  MapPin,
  ArrowLeft,
} from "lucide-react";

const SIDEBAR_NAV = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs", icon: BookOpen },
      { title: "Quick Start", href: "/docs/quickstart", icon: Zap },
      { title: "How It Works", href: "/docs/how-it-works", icon: Cog },
    ],
  },
  {
    title: "API Reference",
    items: [
      { title: "Overview", href: "/docs/api", icon: Code },
      { title: "Authentication", href: "/docs/api/authentication", icon: Shield },
      { title: "Rate Limits", href: "/docs/api/rate-limits", icon: Timer },
      { title: "Credentials", href: "/docs/api/credentials", icon: FileText },
      { title: "Batch Verify", href: "/docs/api/batch-verify", icon: Layers },
      { title: "Errors", href: "/docs/api/errors", icon: AlertCircle },
    ],
  },
  {
    title: "Smart Contracts",
    items: [
      { title: "Overview", href: "/docs/contracts", icon: Code },
      { title: "Deployed Addresses", href: "/docs/contracts/addresses", icon: MapPin },
    ],
  },
];

function SidebarLink({
  href,
  title,
  icon: Icon,
  isActive,
}: {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
        isActive
          ? "bg-[var(--primary-light)] text-[var(--primary)] font-medium"
          : "text-[var(--grey-600)] hover:text-[var(--grey-800)] hover:bg-[var(--grey-100)]"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {title}
    </Link>
  );
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-[var(--grey-300)] bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-[var(--grey-500)] hover:text-[var(--grey-700)] transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              App
            </Link>
            <div className="w-px h-5 bg-[var(--grey-300)]" />
            <Link href="/docs" className="flex items-center gap-2">
              <span className="font-semibold text-[var(--grey-800)] font-[family-name:var(--font-space-grotesk)]">
                ZKCred
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
                Docs
              </span>
            </Link>
          </div>
          <div className="text-xs text-[var(--grey-500)]">v1.0.0</div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 shrink-0 border-r border-[var(--grey-200)] sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-6 px-4">
          <nav className="space-y-6">
            {SIDEBAR_NAV.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-[var(--grey-500)] uppercase tracking-wider mb-2 px-3">
                  {section.title}
                </h3>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <SidebarLink
                      key={item.href}
                      href={item.href}
                      title={item.title}
                      icon={item.icon}
                      isActive={pathname === item.href}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden sticky top-14 z-40 bg-white border-b border-[var(--grey-200)] overflow-x-auto">
          <div className="flex gap-1 p-2">
            {SIDEBAR_NAV.flatMap((section) =>
              section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    pathname === item.href
                      ? "bg-[var(--primary-light)] text-[var(--primary)] font-medium"
                      : "text-[var(--grey-600)] hover:bg-[var(--grey-100)]"
                  }`}
                >
                  {item.title}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0 py-8 px-8 md:px-12">
          <article className="prose prose-slate max-w-3xl prose-headings:font-[family-name:var(--font-space-grotesk)] prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-code:before:content-none prose-code:after:content-none prose-code:bg-[var(--grey-100)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal prose-pre:bg-[#1e1e2e] prose-pre:text-[#cdd6f4] prose-table:text-sm prose-th:text-left prose-th:font-semibold prose-td:py-2 prose-a:text-[var(--primary)] prose-a:no-underline hover:prose-a:underline">
            {children}
          </article>
        </main>
      </div>
    </div>
  );
}

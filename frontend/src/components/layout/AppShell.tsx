"use client";

import { usePathname } from "next/navigation";
import { useAppStore } from "@/stores/useAppStore";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { LandingPage } from "@/components/landing";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const btcWallet = useAppStore((state) => state.btcWallet);
  const isConnected = btcWallet.status === "connected";

  // Docs pages are public — no wallet gating
  if (pathname.startsWith("/docs")) {
    return <>{children}</>;
  }

  // Disconnected users see the landing page
  if (!isConnected) {
    return <LandingPage />;
  }

  // Connected users get the full app shell
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 md:ml-[247px] flex flex-col h-screen overflow-hidden">
        <Header />
        <main className={`flex-1 flex flex-col min-h-0 ${pathname === "/chat" ? "pb-20 md:pb-0" : "p-6 pb-20 md:pb-6 overflow-y-auto"}`}>{children}</main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}

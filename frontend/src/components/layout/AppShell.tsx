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

  // Show landing page for disconnected users on the home route
  if (!isConnected && pathname === "/") {
    return <LandingPage />;
  }

  // For disconnected users on other routes, redirect to landing
  if (!isConnected) {
    return <LandingPage />;
  }

  // Connected users get the full app shell
  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 md:ml-[247px] flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex flex-col p-6 pb-20 md:pb-6">{children}</main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}

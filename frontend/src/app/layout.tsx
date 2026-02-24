import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZKCred — Privacy Credentials for Bitcoin",
  description:
    "Create privacy-preserving credentials for your Bitcoin holdings on Starknet. Prove your tier without revealing your wallet.",
  keywords: [
    "Bitcoin",
    "Starknet",
    "ZK",
    "Zero Knowledge",
    "Privacy",
    "Credentials",
    "DeFi",
    "Crypto",
  ],
  authors: [{ name: "ZKCred Team" }],
  openGraph: {
    title: "ZKCred — Privacy Credentials for Bitcoin",
    description:
      "Create privacy-preserving credentials for your Bitcoin holdings on Starknet.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
    >
      <body className="antialiased bg-[var(--background-secondary)]">
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
      </body>
    </html>
  );
}

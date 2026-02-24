import type { Metadata } from "next";
import { Sora, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
      className={`${sora.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <div className="flex min-h-screen">
          {/* Desktop Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <div className="flex-1 md:ml-[72px] flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 flex flex-col pb-16 md:pb-0">{children}</main>
          </div>

          {/* Mobile Navigation */}
          <MobileNav />
        </div>
      </body>
    </html>
  );
}

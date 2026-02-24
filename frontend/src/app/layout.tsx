import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

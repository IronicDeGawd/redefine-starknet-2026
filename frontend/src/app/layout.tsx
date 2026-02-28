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
  title: "ZKCred — Multi-Platform Privacy Credentials",
  description:
    "Create privacy-preserving credentials for Bitcoin, Ethereum, GitHub, Codeforces, Steam, and Strava on Starknet. Prove your reputation without revealing personal data.",
  keywords: [
    "Bitcoin",
    "Ethereum",
    "GitHub",
    "Starknet",
    "ZK",
    "Zero Knowledge",
    "Privacy",
    "Credentials",
    "Reputation",
    "Multi-credential",
  ],
  authors: [{ name: "ZKCred Team" }],
  openGraph: {
    title: "ZKCred — Multi-Platform Privacy Credentials",
    description:
      "Create privacy-preserving credentials across 6 platforms on Starknet.",
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

import { defineConfig } from "vocs";

export default defineConfig({
  title: "ZKCred",
  description: "Privacy-preserving credentials for Bitcoin holders on Starknet",
  logoUrl: "/logo.svg",
  iconUrl: "/favicon.ico",
  topNav: [
    { text: "Docs", link: "/docs" },
    { text: "API Reference", link: "/api" },
    { text: "GitHub", link: "https://github.com/your-repo/zkcred" },
  ],
  sidebar: [
    {
      text: "Getting Started",
      items: [
        { text: "Introduction", link: "/docs" },
        { text: "Quick Start", link: "/docs/quickstart" },
        { text: "How It Works", link: "/docs/how-it-works" },
      ],
    },
    {
      text: "Credentials",
      items: [
        { text: "BTC Tier", link: "/docs/credentials/btc-tier" },
        { text: "Wallet Age", link: "/docs/credentials/wallet-age" },
        { text: "Verification", link: "/docs/credentials/verification" },
      ],
    },
    {
      text: "API Reference",
      items: [
        { text: "Overview", link: "/api" },
        { text: "Authentication", link: "/api/authentication" },
        { text: "Rate Limits", link: "/api/rate-limits" },
        { text: "Credentials", link: "/api/credentials" },
        { text: "Batch Verify", link: "/api/batch-verify" },
        { text: "Errors", link: "/api/errors" },
      ],
    },
    {
      text: "Smart Contracts",
      items: [
        { text: "Overview", link: "/contracts" },
        { text: "CredentialRegistry", link: "/contracts/registry" },
        { text: "Deployed Addresses", link: "/contracts/addresses" },
      ],
    },
  ],
  socials: [
    {
      icon: "github",
      link: "https://github.com/your-repo/zkcred",
    },
    {
      icon: "x",
      link: "https://x.com/zkcred",
    },
  ],
});

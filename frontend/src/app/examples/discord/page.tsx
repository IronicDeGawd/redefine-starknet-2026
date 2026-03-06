"use client";

import { useState } from "react";
import Image from "next/image";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const BOT_CODE = `const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require("discord.js");

// --- Configuration ---
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const ZKCRED_API_URL = process.env.ZKCRED_API_URL || "http://localhost:3000";
const ZKCRED_API_KEY = process.env.ZKCRED_API_KEY;

const TIER_EMOJIS = { 0: "\\u{1F331}", 1: "\\u2B50", 2: "\\u{1F48E}", 3: "\\u{1F451}" };

// --- Verify Command Handler ---
async function handleVerify(interaction) {
  const credentialId = interaction.options.getString("credential_id");
  await interaction.deferReply();

  const res = await fetch(
    \`\${ZKCRED_API_URL}/api/v1/credentials/\${credentialId}/verify\`,
    { method: "POST", headers: { "X-API-Key": ZKCRED_API_KEY } }
  );
  const data = await res.json();

  if (data.valid) {
    const { credential } = data;
    const emoji = TIER_EMOJIS[credential.tier] ?? "\\u2728";
    // Assign role based on credential type + tier...
    const embed = new EmbedBuilder()
      .setTitle(\`\${emoji} Credential Verified!\`)
      .setDescription(\`\${credential.tierName} (Tier \${credential.tier})\`)
      .setColor(0x5B7FFF);
    await interaction.editReply({ embeds: [embed] });
  }
}`;

const TIERS = [
  { name: "Tier 0", emoji: "\u{1F331}", color: "var(--tier-shrimp)", bg: "var(--tier-shrimp-bg)", textColor: "var(--grey-700)" },
  { name: "Tier 1", emoji: "\u2B50", color: "var(--tier-crab)", bg: "var(--tier-crab-bg)", textColor: "#B45309" },
  { name: "Tier 2", emoji: "\u{1F48E}", color: "var(--tier-fish)", bg: "var(--tier-fish-bg)", textColor: "#1D4ED8" },
  { name: "Tier 3", emoji: "\u{1F451}", color: "var(--tier-whale)", bg: "var(--tier-whale-bg)", textColor: "#6D28D9" },
];

const QUICK_START_STEPS = [
  { step: 1, label: "Clone the bot", code: "git clone https://github.com/zkcred/examples && cd examples/discord-bot" },
  { step: 2, label: "Install dependencies", code: "npm install" },
  { step: 3, label: "Configure environment", code: "cp .env.example .env  # Set DISCORD_TOKEN, ZKCRED_API_KEY, ZKCRED_API_URL" },
  { step: 4, label: "Start the bot", code: "npm start" },
];

function DiscordIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.175 13.175 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"
        fill="#5865F2"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--grey-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--grey-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function DiscordBotPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(BOT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = BOT_CODE;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* ============================================
            Section 1: Hero
           ============================================ */}
        <section className="mb-16 animate-fade-in">
          <div
            className="flex items-center gap-4 mb-4"
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "var(--radius-lg)",
                background: "#5865F2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(88, 101, 242, 0.35)",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.175 13.175 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"
                  fill="white"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] font-[var(--font-display)]">
                Discord Bot Integration
              </h1>
              <p className="text-[var(--text-secondary)] mt-1">
                Gate your Discord server with ZKCred reputation credentials
              </p>
            </div>
          </div>
        </section>

        {/* ============================================
            Section 2: How It Works
           ============================================ */}
        <section className="mb-16">
          <h2
            className="text-lg md:text-xl font-semibold text-[var(--text-primary)] font-[var(--font-display)] mb-6"
          >
            How It Works
          </h2>

          {/* Desktop: horizontal flow */}
          <div className="hidden lg:flex items-start gap-4">
            {/* Step 1 */}
            <div
              className="flex-1 card card-interactive"
              style={{ padding: "24px 20px", textAlign: "center" }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--primary-light)",
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <UserIcon />
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 4,
                }}
              >
                Step 1
              </div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                User runs <code style={{
                  background: "var(--grey-100)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: "0.875em",
                  fontFamily: "monospace",
                }}>/verify</code>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Member types the slash command in any channel with their credential ID
              </p>
            </div>

            {/* Arrow */}
            <div className="flex items-center pt-12 shrink-0">
              <ArrowIcon />
            </div>

            {/* Step 2 */}
            <div
              className="flex-1 card card-interactive"
              style={{ padding: "24px 20px", textAlign: "center" }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--info-light)",
                  color: "var(--info)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <ShieldIcon />
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 4,
                }}
              >
                Step 2
              </div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                Bot checks ZKCred API
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Credential is verified on-chain via the public API endpoint
              </p>
            </div>

            {/* Arrow */}
            <div className="flex items-center pt-12 shrink-0">
              <ArrowIcon />
            </div>

            {/* Step 3 */}
            <div
              className="flex-1 card card-interactive"
              style={{ padding: "24px 20px", textAlign: "center" }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--success-light)",
                  color: "var(--success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <CheckCircleIcon />
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 4,
                }}
              >
                Step 3
              </div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                Role assigned
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Tier-based Discord role is automatically granted to the member
              </p>
            </div>
          </div>

          {/* Mobile: vertical flow */}
          <div className="flex lg:hidden flex-col items-center gap-3">
            {/* Step 1 */}
            <div
              className="w-full card card-interactive"
              style={{ padding: "20px", display: "flex", alignItems: "center", gap: 16 }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--primary-light)",
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <UserIcon />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Step 1
                </div>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>
                  User runs <code style={{ background: "var(--grey-100)", padding: "1px 5px", borderRadius: 4, fontSize: "0.85em", fontFamily: "monospace" }}>/verify</code>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4, marginTop: 2 }}>
                  Member types the slash command with their credential ID
                </p>
              </div>
            </div>

            <ArrowDownIcon />

            {/* Step 2 */}
            <div
              className="w-full card card-interactive"
              style={{ padding: "20px", display: "flex", alignItems: "center", gap: 16 }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--info-light)",
                  color: "var(--info)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ShieldIcon />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Step 2
                </div>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>
                  Bot checks ZKCred API
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4, marginTop: 2 }}>
                  Credential is verified on-chain via the public API
                </p>
              </div>
            </div>

            <ArrowDownIcon />

            {/* Step 3 */}
            <div
              className="w-full card card-interactive"
              style={{ padding: "20px", display: "flex", alignItems: "center", gap: 16 }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--success-light)",
                  color: "var(--success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CheckCircleIcon />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Step 3
                </div>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>
                  Role assigned
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4, marginTop: 2 }}>
                  Tier-based Discord role is granted automatically
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            Section 3: Demo GIF
           ============================================ */}
        <section className="mb-16">
          <h2
            className="text-lg md:text-xl font-semibold text-[var(--text-primary)] font-[var(--font-display)] mb-6"
          >
            Bot Demo
          </h2>
          <div
            style={{
              position: "relative",
              width: "100%",
              paddingBottom: "56.25%", /* 16:9 aspect ratio */
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border-light)",
              background: "var(--grey-50)",
              overflow: "hidden",
            }}
          >
            <Image
              src={`${BASE_PATH}/discord_bot.gif`}
              alt="Discord bot demo showing the /verify command flow"
              fill
              unoptimized
              style={{ objectFit: "cover" }}
            />
          </div>
        </section>

        {/* ============================================
            Section 4: Bot Code
           ============================================ */}
        <section className="mb-16">
          <div className="mb-6">
            <h2
              className="text-lg md:text-xl font-semibold text-[var(--text-primary)] font-[var(--font-display)]"
            >
              Bot Code
            </h2>
            <p className="text-[var(--text-secondary)] mt-1 text-sm">
              Ready-to-deploy Discord bot using ZKCred API
            </p>
          </div>

          <div
            style={{
              borderRadius: "var(--radius-xl)",
              overflow: "hidden",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {/* Code block header */}
            <div
              style={{
                background: "#181825",
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #313244",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#f38ba8" }} />
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#f9e2af" }} />
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#a6e3a1" }} />
                </div>
                <span style={{ fontSize: 13, color: "#6c7086", fontFamily: "monospace" }}>
                  discord-bot.js
                </span>
              </div>
              <button
                onClick={handleCopy}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid #313244",
                  background: copied ? "rgba(166, 227, 161, 0.15)" : "transparent",
                  color: copied ? "#a6e3a1" : "#6c7086",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 200ms ease",
                }}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Code block body */}
            <pre
              style={{
                background: "#1e1e2e",
                color: "#cdd6f4",
                padding: "20px 24px",
                margin: 0,
                overflowX: "auto",
                fontSize: 13,
                lineHeight: 1.65,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
              }}
            >
              <code>{BOT_CODE}</code>
            </pre>
          </div>

          {/* GitHub link */}
          <div className="mt-4 flex justify-end">
            <a
              href="#"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--primary)",
                textDecoration: "none",
                transition: "opacity 200ms ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              View full source on GitHub
              <ExternalLinkIcon />
            </a>
          </div>
        </section>

        {/* ============================================
            Section 5: Quick Start
           ============================================ */}
        <section className="mb-16">
          <h2
            className="text-lg md:text-xl font-semibold text-[var(--text-primary)] font-[var(--font-display)] mb-6"
          >
            Quick Start
          </h2>

          <div className="grid gap-3">
            {QUICK_START_STEPS.map(({ step, label, code }) => (
              <div
                key={step}
                className="card"
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "var(--radius-md)",
                    background: "var(--primary)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {step}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                    {label}
                  </div>
                  <code
                    style={{
                      display: "block",
                      background: "#1e1e2e",
                      color: "#cdd6f4",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      fontSize: 12,
                      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                      overflowX: "auto",
                      whiteSpace: "pre",
                      lineHeight: 1.5,
                    }}
                  >
                    {code}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================
            Section 6: Tier Roles Preview
           ============================================ */}
        <section className="mb-8">
          <h2
            className="text-lg md:text-xl font-semibold text-[var(--text-primary)] font-[var(--font-display)] mb-6"
          >
            Tier Roles
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6" style={{ marginTop: -16 }}>
            Members are assigned a Discord role matching their credential tier
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className="card card-interactive"
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "var(--radius-lg)",
                    background: tier.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                  }}
                >
                  {tier.emoji}
                </div>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 15 }}>
                  {tier.name}
                </div>
                <span
                  className="tier-badge"
                  style={{
                    background: tier.bg,
                    color: tier.textColor,
                  }}
                >
                  @{tier.name}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

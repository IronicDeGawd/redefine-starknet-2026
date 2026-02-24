# ZKCred

> Privacy-preserving credentials for Bitcoin holders on Starknet

ZKCred enables Bitcoin holders to create verifiable credentials that prove their holdings tier without revealing their wallet address or exact balance. Built for the RE{DEFINE} Hackathon 2026.

## Overview

ZKCred combines:
- **Bitcoin wallet signatures** for ownership verification
- **Starknet smart contracts** for on-chain credential storage
- **AI-powered chat interface** for conversational credential issuance
- **Privacy-first design** — only tier is revealed, never the actual wallet

### Tier System

| Tier | Name | BTC Balance | Emoji |
|------|------|-------------|-------|
| 0 | Shrimp | < 1 BTC | 🦐 |
| 1 | Crab | 1-10 BTC | 🦀 |
| 2 | Fish | 10-100 BTC | 🐟 |
| 3 | Whale | 100+ BTC | 🐋 |

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                  │
│  Next.js 14 • Tailwind • Zustand • sats-connect                  │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Chat UI     │  │ Wallet      │  │ Credential  │              │
│  │ (AI Agent)  │  │ Connection  │  │ Cards       │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                       BACKEND (Next.js API)                       │
│                                                                   │
│  /api/chat       → AWS Bedrock (Claude) for AI agent             │
│  /api/credential → Issue credentials on Starknet                 │
│  /api/verify     → Verify credentials from Starknet              │
│  /api/health     → Service health check                          │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    STARKNET (Sepolia Testnet)                     │
│                                                                   │
│  CredentialRegistry    → Store/manage credentials                │
│  CredentialVerifier    → Helper verification functions           │
└──────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 22+
- Scarb 2.15.2+ (for contracts)
- Starknet Foundry 0.56.0+ (for contract testing)

### 1. Clone & Install

```bash
git clone <repo-url>
cd redefine-hackathon-2026

# Install frontend dependencies
cd frontend
npm install
```

### 2. Environment Setup

Create `frontend/.env.local`:

```env
# AWS Bedrock (for AI chat)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Starknet (Sepolia)
NEXT_PUBLIC_STARKNET_NETWORK=sepolia
STARKNET_PRIVATE_KEY=your_deployer_private_key
CREDENTIAL_REGISTRY_ADDRESS=0x073566a1fcb9f4f7ca7a0f8d0e056929c59ccf435b8ae88ca1a39251bfeed216
CREDENTIAL_VERIFIER_ADDRESS=0x07d69c729df6c1ac6d2c011a6e740fb23ea924928dcacb8f2f1a6c6c5b4f34e2
```

### 3. Run Development Server

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
redefine-hackathon-2026/
├── contracts/               # Cairo smart contracts
│   ├── src/
│   │   ├── credential_registry.cairo
│   │   └── credential_verifier.cairo
│   ├── tests/
│   └── README.md
│
├── frontend/                # Next.js application
│   ├── src/
│   │   ├── app/            # Pages (App Router)
│   │   ├── components/     # UI components
│   │   ├── hooks/          # React hooks
│   │   ├── lib/            # Utilities & integrations
│   │   ├── stores/         # Zustand state
│   │   └── types/          # TypeScript types
│   └── README.md
│
├── context/                 # Research & planning docs (gitignored)
│   ├── research/
│   └── plan/
│
└── README.md               # This file
```

## Features

### For Users
- **Chat-based issuance** — Tell the AI what you want to prove
- **One-click wallet connection** — Connect via Xverse
- **Instant verification** — Anyone can verify a credential by ID
- **Privacy preserved** — Wallet address never exposed

### For Developers
- **On-chain verification** — Call `CredentialVerifier` from your contracts
- **Batch verification** — Verify up to 100 credentials in one call
- **Event-based tracking** — Listen for `CredentialIssued` events

## Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| CredentialRegistry | [`0x073566a1fcb9f4f7ca7a0f8d0e056929c59ccf435b8ae88ca1a39251bfeed216`](https://sepolia.starkscan.co/contract/0x073566a1fcb9f4f7ca7a0f8d0e056929c59ccf435b8ae88ca1a39251bfeed216) |
| CredentialVerifier | [`0x07d69c729df6c1ac6d2c011a6e740fb23ea924928dcacb8f2f1a6c6c5b4f34e2`](https://sepolia.starkscan.co/contract/0x07d69c729df6c1ac6d2c011a6e740fb23ea924928dcacb8f2f1a6c6c5b4f34e2) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 19, Tailwind CSS, Zustand, Framer Motion |
| AI | AWS Bedrock (Claude Sonnet) |
| Blockchain | Starknet (Cairo), starknet.js |
| Bitcoin | sats-connect (Xverse wallet) |
| Styling | Custom "Obsidian Vault" design system |

## Security

- Bitcoin signatures verified server-side using `@noble/secp256k1`
- Owner-only revocation on contracts
- Batch verification capped at 100 to prevent DoS
- Input sanitization on all API endpoints
- No raw wallet addresses stored on-chain (only hashes)

## License

MIT

---

Built with for the [RE{DEFINE} Hackathon](https://dorahacks.io/hackathon/redefine) by the Starknet Foundation.

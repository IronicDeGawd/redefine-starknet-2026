# ZKCred

> Privacy-preserving credentials for Bitcoin holders on Starknet

ZKCred enables Bitcoin holders to create verifiable credentials that prove their holdings tier or wallet age without revealing their wallet address or exact balance. Built for the RE{DEFINE} Hackathon 2026.

## Overview

ZKCred combines:
- **Bitcoin wallet signatures (BIP-322)** for ownership verification
- **Oracle-verified credentials** with on-chain proof of verification
- **Starknet smart contracts** for immutable credential storage
- **AI-powered chat interface** for conversational credential issuance
- **Public REST API** for third-party integrations
- **Privacy-first design** — only the tier is revealed, never the actual wallet

### Credential Types

#### Bitcoin Tier (`btc_tier`)

| Tier | Name | BTC Balance | Emoji |
|------|------|-------------|-------|
| 0 | Shrimp | < 1 BTC | 🦐 |
| 1 | Crab | 1-10 BTC | 🦀 |
| 2 | Fish | 10-100 BTC | 🐟 |
| 3 | Whale | 100+ BTC | 🐋 |

#### Wallet Age (`wallet_age`)

| Tier | Name | Wallet Age | Emoji |
|------|------|------------|-------|
| 0 | Newbie | < 30 days | 🌱 |
| 1 | Hodler | 30-180 days | 💎 |
| 2 | Veteran | 180-365 days | ⭐ |
| 3 | OG | 1+ year | 👑 |

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  Next.js 15 • Tailwind CSS v4 • Zustand • sats-connect           │
│                                                                   │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │
│  │ Chat UI   │ │ Wallet    │ │ Credential│ │ Playground│        │
│  │ (AI Agent)│ │ Gating    │ │ Cards     │ │ & Lounge  │        │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘        │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                       BACKEND (Next.js API)                       │
│                                                                   │
│  /api/chat               → AWS Bedrock (Claude) AI agent         │
│  /api/credential         → Issue credentials on Starknet         │
│  /api/credential/verified → Oracle-verified credential issuance  │
│  /api/v1/credentials/:id → Public API: get credential details    │
│  /api/v1/credentials/:id/verify → Public API: verify credential  │
│  /api/v1/credentials/batch-verify → Public API: batch verify     │
│  /api/v1/keys            → API key management                    │
│  /api/v1/health          → Service health check                  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    STARKNET (Sepolia Testnet)                      │
│                                                                   │
│  CredentialRegistry → Store, issue, revoke credentials           │
│  CredentialVerifier → Helper verification functions              │
│                                                                   │
│  On-chain data: tier, credential type, verification_hash,        │
│                 oracle_provider, issuance timestamp               │
└──────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 22+
- Scarb 2.15.2+ (for Cairo contracts)
- Starknet Foundry 0.56.0+ (for contract testing)
- Redis (for session storage and API key management)

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
# AWS Bedrock (for AI chat agent)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Starknet (Sepolia)
STARKNET_RPC_URL=https://rpc.starknet-testnet.lava.build/rpc/v0_8
NEXT_PUBLIC_STARKNET_NETWORK=sepolia
STARKNET_PRIVATE_KEY=your_deployer_private_key
STARKNET_ACCOUNT_ADDRESS=your_deployer_account_address

# Contract Addresses (deployed on Sepolia)
CREDENTIAL_REGISTRY_ADDRESS=0xab5fbdd27cc7e4d337742295d62c986489d6e36f1020009bffa7935f9e1038
CREDENTIAL_VERIFIER_ADDRESS=0x22a8cfb1aa5383fd39f6c3db717770905379a3531457b75bd1e56917392e3a4

# Oracle Config (mock tiers for demo — address:tier pairs)
MOCK_TIERS=bc1ql8zhxyhnumvqsuf02d27zxqq4p2zmre4krwplg:3,bc1qzywsx7q3zxlvdak3wc9eywkwmrpdes2el8q2cw:2

# Redis (for API keys and chat session storage)
REDIS_URL=redis://localhost:6379

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_EXPLORER_URL=https://sepolia.starkscan.co
```

### 3. Run Development Server

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Build & Deploy Contracts (optional)

If you need to redeploy the contracts:

```bash
cd contracts

# Build
scarb build

# Run tests
snforge test

# Deploy (requires funded Starknet account)
export STARKNET_PRIVATE_KEY=0x...
export STARKNET_ACCOUNT_ADDRESS=0x...
node scripts/deploy.js
```

## Project Structure

```
redefine-hackathon-2026/
├── contracts/                  # Cairo smart contracts
│   ├── src/
│   │   ├── interfaces.cairo          # Contract interfaces & Credential struct
│   │   ├── credential_registry.cairo # Main registry (issue, revoke, get)
│   │   └── credential_verifier.cairo # Verification helper
│   ├── tests/
│   │   ├── test_registry.cairo       # Registry unit tests
│   │   └── test_verifier.cairo       # Verifier unit tests
│   └── scripts/
│       └── deploy.js                 # Deployment script (starknet.js)
│
├── frontend/                   # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── credentials/          # Credential management
│   │   │   ├── verify/               # Credential verification
│   │   │   ├── playground/           # Interactive API playground
│   │   │   ├── lounge/               # Tier-gated content demo
│   │   │   ├── examples/discord/     # Discord bot showcase
│   │   │   ├── settings/             # API key management
│   │   │   ├── docs/                 # Documentation (MDX)
│   │   │   └── api/                  # API routes
│   │   │       ├── chat/             # AI chat agent (Bedrock)
│   │   │       ├── credential/       # Credential issuance
│   │   │       └── v1/               # Public API v1
│   │   ├── components/               # UI components
│   │   ├── hooks/                    # React hooks
│   │   ├── lib/
│   │   │   ├── bedrock/              # AWS Bedrock AI integration
│   │   │   ├── starknet/             # Starknet client & ABI
│   │   │   ├── oracle/               # Balance & wallet age oracles
│   │   │   ├── redis/                # Redis client for sessions
│   │   │   ├── api/                  # API auth, rate limiting
│   │   │   └── utils/                # Crypto, validation, formatting
│   │   ├── stores/                   # Zustand state management
│   │   └── types/                    # TypeScript types
│   └── .env.local                    # Environment variables
│
├── examples/                   # Integration examples
│   └── discord-bot/                  # Discord bot example
│       ├── index.js                  # Bot source code
│       ├── register-commands.js      # Slash command registration
│       └── package.json
│
├── context/                    # Research & planning docs (gitignored)
└── README.md
```

## Features

### Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | Overview with credential stats and wallet gating |
| Credentials | `/credentials` | View and manage issued credentials |
| Verify | `/verify` | Verify any credential by ID |
| API Playground | `/playground` | Interactive API testing with live requests |
| Whale Lounge | `/lounge` | Tier-gated content demo (Shrimp → Whale) |
| Discord Bot | `/examples/discord` | Bot showcase with code, flow diagram, and quick start |
| Settings | `/settings` | Generate and manage API keys |
| Docs | `/docs` | API documentation, quickstart guide, contract details |

### Public API (v1)

All endpoints under `/api/v1/` require an API key via the `X-API-Key` header (except health check). Generate keys from the Settings page.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Service health check (no auth) |
| `GET` | `/api/v1/credentials/{id}` | Get credential details |
| `POST` | `/api/v1/credentials/{id}/verify` | Verify a credential (optional `minTier` body) |
| `POST` | `/api/v1/credentials/batch-verify` | Batch verify up to 100 credentials |
| `POST` | `/api/v1/keys` | Generate a new API key |

### AI Chat Agent

The AI chat agent (powered by AWS Bedrock / Claude) guides users through credential issuance:

1. User describes what they want to prove (Bitcoin balance tier or wallet age)
2. Agent requests a BIP-322 wallet signature for ownership verification
3. Oracle verifies the claim (balance lookup or wallet age check)
4. Credential is issued on-chain with oracle verification metadata

### Oracle Verification

Credentials can be issued in two modes:
- **Oracle-verified**: Balance/age checked via oracle, `verification_hash` and `oracle_provider` stored on-chain
- **Self-declared**: User claims a tier without oracle proof (marked with `0x0` verification hash)

For demos, `MOCK_TIERS` env var maps Bitcoin addresses to pre-set tiers without requiring real balance lookups.

## Discord Bot Setup

A ready-to-deploy Discord bot that assigns server roles based on ZKCred credential tiers.

### Setup

```bash
cd examples/discord-bot
npm install
```

### Configuration

Set these environment variables:

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Bot token from [Discord Developer Portal](https://discord.com/developers/applications) |
| `DISCORD_CLIENT_ID` | Application ID |
| `GUILD_ID` | Discord server ID |
| `ZKCRED_API_URL` | ZKCred API base URL (default: `http://localhost:3000`) |
| `ZKCRED_API_KEY` | API key generated from ZKCred Settings page |

### Invite the Bot

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268435456&scope=bot%20applications.commands
```

### Run

```bash
npm start
```

Members can use `/verify credential_id:0x...` to get assigned Shrimp/Crab/Fish/Whale roles.

## Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| CredentialRegistry | [`0xab5fbdd27cc7...e1038`](https://sepolia.starkscan.co/contract/0xab5fbdd27cc7e4d337742295d62c986489d6e36f1020009bffa7935f9e1038) |
| CredentialVerifier | [`0x22a8cfb1aa53...2e3a4`](https://sepolia.starkscan.co/contract/0x22a8cfb1aa5383fd39f6c3db717770905379a3531457b75bd1e56917392e3a4) |

### Credential Struct (on-chain)

```cairo
struct Credential {
    pubkey_hash: felt252,        // Hash of Bitcoin public key
    credential_type: felt252,    // "btc_tier" or "wallet_age"
    tier: u8,                    // 0-3
    issued_at: u64,              // Unix timestamp
    revoked: bool,
    verification_hash: felt252,  // Hash of oracle response (0 if self-declared)
    oracle_provider: felt252,    // Oracle identifier (0 if self-declared)
}
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS v4, Zustand |
| AI | AWS Bedrock (Claude Sonnet) |
| Blockchain | Starknet (Cairo), starknet.js |
| Bitcoin | sats-connect (Xverse), BIP-322 signatures (bip322-js) |
| Storage | Redis (sessions, API keys, rate limiting) |
| Docs | MDX with @tailwindcss/typography |

## Security

- Bitcoin signatures verified server-side using BIP-322 standard (`bip322-js`)
- Oracle verification metadata stored on-chain (hash + provider) for auditability
- API key authentication with Redis-backed rate limiting
- Owner-only credential revocation on contracts
- Batch verification capped at 100 to prevent DoS
- Input sanitization on all API endpoints
- No raw wallet addresses stored on-chain (only hashes)
- `felt252` truncation (31 bytes) for safe hash storage in Starknet

## Testing

### Smart Contracts

```bash
cd contracts
snforge test    # Runs 25 unit tests
```

### Frontend

```bash
cd frontend
npm run build   # Type-checks and builds all pages
npm run lint    # ESLint checks
```

## License

MIT

---

Built for the [RE{DEFINE} Hackathon](https://dorahacks.io/hackathon/redefine) by the Starknet Foundation.

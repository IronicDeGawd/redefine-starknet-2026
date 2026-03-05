# ZKCred — Privacy-Preserving Identity Passport on Starknet

> **RE{DEFINE} Hackathon 2026** | Track: Privacy + Bitcoin on Starknet

ZKCred solves a fundamental Web3 problem: **you shouldn't have to reveal your wallet to prove what's in it.** We built a full credential infrastructure where Bitcoin holders and Web3 users can prove facts about themselves — their BTC tier, GitHub reputation, gaming history, fitness activity — as verifiable on-chain credentials, without exposing the underlying data.

**One sentence:** ZKCred is a privacy-first, AI-powered credential passport that lets you prove who you are without revealing what you own.

---

## Why ZKCred?

Today, gated communities ask for wallet screenshots. Airdrops require you to connect your whale wallet publicly. Discord servers can't verify Bitcoin ownership without doxxing. **ZKCred fixes this.**

- A Bitcoin whale proves they hold 100+ BTC → receives a `Whale` credential → shares only the credential ID
- A GitHub developer proves 500+ stars → gets a `Star Developer` badge → NFT minted on Starknet
- A DeFi protocol integrates ZKCred's API → gates access in 5 lines of code

Zero balance revealed. Zero wallet exposed. Fully on-chain. Trustless.

---

## What We Built

### 🔐 Privacy-First Credentials

| Credential | Source | Verification |
|---|---|---|
| `btc_tier` | Bitcoin wallet | BIP-322 signature (Xverse) |
| `wallet_age` | Bitcoin wallet | BIP-322 + Mempool.space oracle |
| `eth_holder` | Ethereum wallet | EIP-191 + public RPC oracle |
| `github_dev` | GitHub profile | OAuth + GitHub API |
| `codeforces_coder` | Codeforces | OIDC callback + public API |
| `steam_gamer` | Steam library | OpenID + Steam Web API |
| `strava_athlete` | Strava activity | OAuth 2.0 + Strava API |

Every credential stores only a Poseidon hash of the identifier on-chain — never the raw wallet address, username, or balance.

### 🤖 AI-Guided Issuance

An AI agent (AWS Bedrock / Claude) walks users through credential creation conversationally. No forms. No technical knowledge needed. Just describe what you want to prove and the agent handles wallet connection, signing, oracle verification, and on-chain issuance.

### ⛓️ Cairo Smart Contracts on Starknet

```
CredentialRegistry   — stores, issues, revokes credentials (on Sepolia)
CredentialVerifier   — helper verification for third-party integrations
BadgeNFT             — soulbound ERC-721, one per credential, cross-contract gating
CredentialMerkle     — Merkle tree accumulator for batch credential proofs
RangeProofVerifier   — on-chain range proof verification (stake in privacy story)
```

**Deployed on Starknet Sepolia:**
- CredentialRegistry: `0xab5fbdd27cc7e4d337742295d62c986489d6e36f1020009bffa7935f9e1038`
- CredentialVerifier: `0x22a8cfb1aa5383fd39f6c3db717770905379a3531457b75bd1e56917392e3a4`

### 🌐 Public REST API

Any dApp can verify credentials without building their own credential system:

```bash
# Check if a user is a Bitcoin whale
curl -X POST https://zkcred.xyz/api/v1/credentials/0xabc.../verify \
  -H "X-API-Key: zkcred_live_xxx" \
  -d '{"minTier": 3}'
# → {"valid": true, "tier": 3, "tierName": "Whale"}
```

Endpoints: `GET /credentials/{id}`, `POST /credentials/{id}/verify`, `POST /credentials/batch-verify`, `GET /health`

### 🎮 Demo Features Built

| Page | What it shows |
|---|---|
| `/connect` | Connect 6 account types, issue credentials |
| `/chat` | AI agent credential creation |
| `/passport` | Multi-chain reputation identity hub |
| `/lounge` | Tier-gated content (Shrimp → Whale access levels) |
| `/playground` | Interactive live API testing |
| `/examples/discord` | Discord bot integration showcase |
| `/crypto` | ZK primitives explainer |
| `/docs` | 11 MDX API documentation pages |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              FRONTEND (Next.js 15)               │
│  Chat UI • Connect • Passport • Playground       │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│           BACKEND (Next.js API Routes)           │
│                                                  │
│  AI Agent (AWS Bedrock / Claude)                 │
│  6 Oracle Connectors (BTC, ETH, GitHub, ...)     │
│  Public REST API v1 (auth, rate-limit, Redis)    │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│           STARKNET SEPOLIA (Cairo)               │
│                                                  │
│  CredentialRegistry  CredentialVerifier          │
│  BadgeNFT (ERC-721)  CredentialMerkle            │
│  RangeProofVerifier                              │
└─────────────────────────────────────────────────┘
```

---

## Privacy Design

| Data | What we store on-chain | What we DON'T store |
|---|---|---|
| Bitcoin wallet | `Poseidon(pubkey)` hash | Address, balance, transaction history |
| ETH address | `Poseidon(address)` hash | Address, balance |
| GitHub username | `Poseidon(username)` hash | Username, repos, email |
| Credential tier | Tier number (0–3) | Exact balance, exact star count |
| Oracle proof | `SHA256(oracle_response)` hash | Raw oracle response |

No raw PII touches the chain. Verifiers learn only the tier — nothing else.

---

## Bitcoin + Xverse Integration

Bitcoin ownership verification uses **BIP-322 message signing** via `sats-connect` (Xverse wallet). The server verifies the signature using `bip322-js`, confirms wallet ownership, then issues a credential without ever seeing the balance.

For the `btc_tier` credential, we query Mempool.space (or the Xverse API) to determine the tier from the confirmed UTXO balance — the actual balance is hashed and stored as an oracle proof hash, never the raw number.

This directly uses **Xverse**, the hackathon sponsor's tooling.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS v4, Zustand |
| AI Agent | AWS Bedrock (Claude Sonnet) with tool_use |
| Blockchain | Starknet Sepolia — Cairo 2.x contracts |
| Bitcoin | sats-connect (Xverse), BIP-322 signatures (bip322-js) |
| Ethereum | EIP-191 server-side verification (@noble/curves) |
| Storage | Redis (API keys, session cache, rate limiting) |
| Oracles | Mempool.space, GitHub API, Steam API, Strava API, Codeforces API |
| Docs | MDX with @tailwindcss/typography |

---

## Quick Start

```bash
# Clone and install
git clone <repo>
cd redefine-hackathon-2026/frontend
npm install

# Configure environment (see .env.example)
cp .env.example .env.local

# Run dev server
npm run dev
# → http://localhost:3000
```

**Required env vars:**
- `AWS_ACCESS_KEY_ID / SECRET` — Bedrock AI agent
- `STARKNET_PRIVATE_KEY / ACCOUNT_ADDRESS` — contract write access
- `CREDENTIAL_REGISTRY_ADDRESS` — deployed contract address
- `REDIS_URL` — API key and session storage

See [`.env.example`](./frontend/.env.example) for the full list.

---

## Smart Contract Testing

```bash
cd contracts
snforge test    # 25 unit tests across 5 test files
```

Tests cover: credential issuance, revocation, duplicate prevention, verifier calls, NFT minting, Merkle proofs, range proof verification.

---

## Integration Example — Discord Bot

A ready-to-deploy Discord bot that assigns server roles based on ZKCred credential tiers:

```js
// User runs /verify 0xabc...
// Bot calls ZKCred API → gets tier → assigns role
client.on("interactionCreate", async (interaction) => {
  const res = await fetch(`${ZKCRED_URL}/api/v1/credentials/${id}/verify`, {
    method: "POST",
    headers: { "X-API-Key": ZKCRED_API_KEY },
    body: JSON.stringify({ minTier: 0 }),
  });
  const { valid, tier } = await res.json();
  if (valid) await member.roles.add(TIER_ROLES[tier]);
});
```

Full bot in [`examples/discord-bot/`](./examples/discord-bot/).

---

## Project Structure

```
redefine-hackathon-2026/
├── contracts/                  # Cairo smart contracts
│   ├── src/
│   │   ├── credential_registry.cairo   # Core registry
│   │   ├── credential_verifier.cairo   # Verification helper
│   │   ├── badge_nft.cairo             # Soulbound ERC-721
│   │   ├── credential_merkle.cairo     # Merkle accumulator
│   │   ├── range_proof_verifier.cairo  # ZK range proofs
│   │   └── interfaces.cairo
│   ├── tests/                  # 25 snforge unit tests
│   └── scripts/                # deploy.js, deploy-badge-nft.js
│
├── frontend/                   # Next.js 15 app
│   ├── src/app/                # 12 pages + API routes
│   ├── src/lib/
│   │   ├── connectors/         # 5 OAuth/OpenID connectors
│   │   ├── oracle/             # Balance + wallet age verifiers
│   │   ├── bedrock/            # AI agent + tool definitions
│   │   ├── starknet/           # Contract clients + ABIs
│   │   ├── crypto/             # Commitment, Merkle utilities
│   │   ├── redis/              # Session cache, API keys
│   │   └── security/           # Content filtering
│   └── src/components/         # UI components
│
└── examples/
    └── discord-bot/            # Ready-to-deploy Discord integration
```

---

## Deployed Contracts

| Contract | Sepolia Address |
|---|---|
| CredentialRegistry | [`0x30dffe...3bc93`](https://sepolia.voyager.online/contract/0x30dffe5b1a71bab0da2cc639d117f54b9c90cfdc0b12e9ecce4b4b12893bc93) |
| CredentialVerifier | [`0x6b03b2...251d`](https://sepolia.voyager.online/contract/0x6b03b228cc65f4fc63c60dfc03b781085f85e3db5c2567c5f2bb56d8662251d) |
| CredentialMerkle | [`0x7a03d3...3b57`](https://sepolia.voyager.online/contract/0x7a03d3644a5328025abcf3dc78b38664b7c8a62d01c86429d518db259c83b57) |
| RangeProofVerifier | [`0x54886d...6bc9`](https://sepolia.voyager.online/contract/0x54886d18ffbaab3e026b39ff6b1f41e26caa0531e20eeb0cf181d0068ec6bc9) |
| BadgeNFT (Soulbound) | [`0x4abf82...f282`](https://sepolia.voyager.online/contract/0x4abf82ef753033b9959077ab8275b008651c38cbe52f9a07d282a0ba74df282) |

---

## License

MIT — Built for the [RE{DEFINE} Hackathon](https://dorahacks.io/hackathon/redefine) by the Starknet Foundation.

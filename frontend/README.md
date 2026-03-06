# ZKCred Frontend

> Next.js application for the ZKCred privacy-preserving credential system

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 15 | App Router, API routes, SSR |
| React 19 | UI components |
| Tailwind CSS v4 | Styling |
| Zustand | State management with persistence |
| Framer Motion | Animations |
| sats-connect | Bitcoin wallet integration (Xverse) |
| Lucide React | Icons |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── chat/          # AI chat endpoint (Bedrock)
│   │   ├── credential/    # Issue credentials
│   │   ├── verify/        # Verify credentials
│   │   └── health/        # Health check
│   ├── credentials/       # User's credentials page
│   ├── verify/            # Public verification page
│   ├── settings/          # Settings page
│   ├── globals.css        # Design system & CSS variables
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page (chat interface)
│
├── components/            # React components
│   ├── chat/              # Chat UI components
│   │   ├── ChatContainer.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ThinkingIndicator.tsx
│   │   ├── ToolAction.tsx
│   │   └── WelcomeScreen.tsx
│   ├── credentials/       # Credential display components
│   │   ├── CredentialCard.tsx
│   │   ├── CredentialVerifier.tsx
│   │   └── TierBadge.tsx
│   ├── layout/            # Layout components
│   │   ├── Header.tsx
│   │   ├── MobileNav.tsx
│   │   └── Sidebar.tsx
│   └── ui/                # Base UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Input.tsx
│
├── hooks/                 # React hooks
│   ├── useBtcWallet.ts    # Bitcoin wallet connection
│   ├── useChat.ts         # AI chat conversation
│   └── useCredential.ts   # Credential operations
│
├── lib/                   # Utilities
│   ├── bedrock/           # AWS Bedrock integration
│   ├── starknet/          # Starknet contract interactions
│   ├── utils/             # Helper functions
│   └── cn.ts              # className utility
│
├── stores/                # Zustand state
│   └── useAppStore.ts     # Global app state
│
└── types/                 # TypeScript types
    ├── credential.ts      # Credential types
    ├── api.ts             # API request/response types
    ├── agent.ts           # AI agent types
    └── index.ts           # Re-exports
```

## Design System

The "Obsidian Vault" design system features:

- **Dark theme** with zinc-based colors
- **Accent colors**: Violet primary, Cyan secondary
- **Typography**: Space Grotesk (headings), Inter (body)
- **Tier gradients**: Each tier has unique colors
  - Shrimp (0): Gray gradient
  - Crab (1): Amber/Orange gradient
  - Fish (2): Blue/Cyan gradient
  - Whale (3): Purple/Violet gradient

CSS variables are defined in `globals.css` and can be accessed via `var(--variable-name)`.

## Getting Started

### Prerequisites

- Node.js 22+
- npm or pnpm

### Installation

```bash
npm install
```

### Environment Variables

Create `.env.local`:

```env
# AWS Bedrock (AI chat)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Starknet
NEXT_PUBLIC_STARKNET_NETWORK=sepolia
STARKNET_PRIVATE_KEY=your_deployer_private_key
CREDENTIAL_REGISTRY_ADDRESS=0x7612f6d36c9b17a58ceb4fba29ffa75b39145efdfd3fcf112edd133299099d6
CREDENTIAL_VERIFIER_ADDRESS=0x7cb3fcee7a4ed14724e50590d322b29bb8cf4b2eaf007fb3e91979ae590f94d
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/chat` | POST | AI chat with tool use |
| `/api/credential` | POST | Issue new credential |
| `/api/verify/[id]` | GET | Verify credential by ID |
| `/api/health` | GET | Service health check |

## State Management

The app uses Zustand with persistence:

- **Messages**: Chat history (session only)
- **Credentials**: User's issued credentials (persisted)
- **BTC Wallet**: Connection state (persisted)
- **Pending Credential**: Current issuance in progress

## Key Flows

### 1. Credential Issuance
1. User connects Bitcoin wallet (Xverse)
2. User chats with AI agent about desired credential
3. AI proposes credential issuance (tool_use)
4. User approves → signs message with BTC wallet
5. Backend verifies signature, issues on Starknet
6. Credential stored in user's local state

### 2. Credential Verification
1. Anyone enters credential ID on /verify
2. Frontend calls `/api/verify/[id]`
3. Backend reads from Starknet registry
4. Result displayed (valid/invalid, tier, status)

## Component Patterns

### Conditional Rendering (React 19)

Use explicit boolean checks with ternary operators:

```tsx
const showComponent = Boolean(condition);

{showComponent ? <Component /> : null}
```

### Tool Actions

Chat messages can include tool_use blocks that render interactive UI:

```tsx
{message.toolUse && !message.toolResult ? (
  <ToolAction toolUse={message.toolUse} onAction={handleAction} />
) : null}
```

## License

MIT

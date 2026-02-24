# ZKCred Demo Steps

> Step-by-step guide for demonstrating ZKCred at RE{DEFINE} Hackathon

## Pre-Demo Setup

### 1. Environment Check
```bash
cd frontend
npm run build  # Ensure build succeeds
npm run dev    # Start dev server
```

### 2. Wallet Preparation
- Install [Xverse Wallet](https://www.xverse.app/) browser extension
- Create or import a Bitcoin wallet
- Have some testnet BTC (not required for demo, but good to have)

### 3. Browser Setup
- Open http://localhost:3000
- Have a second tab ready for Starkscan to show transactions

---

## Demo Script

### Part 1: Introduction (1 min)

**Talking Points:**
- "ZKCred enables Bitcoin holders to create verifiable credentials that prove their holdings tier without revealing their wallet address or exact balance"
- "This solves the privacy problem of proving you're a 'whale' without doxxing yourself"
- Show the tier system: Shrimp, Crab, Fish, Whale

### Part 2: Connect Wallet (1 min)

1. Click **"Connect Wallet"** button in sidebar
2. Xverse popup appears → Approve connection
3. Show that wallet is connected (address displayed)

**Talking Point:**
- "We use BIP-322 message signing for ownership verification"

### Part 3: Chat with AI Agent (2 min)

1. In the chat, type:
   > "I want to prove I'm a whale without revealing my wallet"

2. AI responds explaining the credential system

3. Type:
   > "Create a BTC tier credential for me"

4. AI proposes credential issuance with tool_use block

**Talking Points:**
- "The AI agent understands your intent and guides you through the process"
- "No technical knowledge required - just chat naturally"

### Part 4: Issue Credential (2 min)

1. Review the proposed credential details:
   - Type: BTC Holdings
   - Tier: (based on mock/real balance)

2. Click **"Approve & Sign"** button

3. Xverse popup → Sign the message

4. Watch the credential being issued:
   - "Issuing credential..." loading state
   - Success card appears with:
     - Tier emoji and name
     - Credential ID
     - Transaction hash (clickable link)

5. Click transaction hash → Opens Starkscan showing on-chain transaction

**Talking Points:**
- "The signature proves wallet ownership"
- "The credential is stored on Starknet - fully on-chain"
- "Only the tier is revealed, never the actual balance"

### Part 5: View Credentials (1 min)

1. Click **"My Credentials"** in sidebar
2. Show credential card with:
   - Tier badge (e.g., Whale)
   - Credential ID
   - Issue date
   - Status (Active)

**Talking Point:**
- "Credentials are stored locally and can be shared by ID"

### Part 6: Verify Credential (2 min)

1. Copy the credential ID
2. Click **"Verify"** in sidebar
3. Paste the credential ID
4. Click **"Verify Credential"**
5. Show verification result:
   - Valid/Invalid status
   - Tier information
   - Issue date

**Talking Points:**
- "Anyone can verify a credential without knowing who owns it"
- "Verification reads directly from Starknet"
- "Perfect for gated access, airdrops, or reputation systems"

### Part 7: Technical Deep Dive (optional, 2 min)

Show the architecture:
1. **Frontend**: Next.js + sats-connect
2. **AI Agent**: AWS Bedrock (Claude) with tool_use
3. **Contracts**: Cairo on Starknet Sepolia
   - CredentialRegistry: stores credentials
   - CredentialVerifier: helper functions

Show Starkscan contract pages:
- [CredentialRegistry](https://sepolia.starkscan.co/contract/0x073566a1fcb9f4f7ca7a0f8d0e056929c59ccf435b8ae88ca1a39251bfeed216)
- [CredentialVerifier](https://sepolia.starkscan.co/contract/0x07d69c729df6c1ac6d2c011a6e740fb23ea924928dcacb8f2f1a6c6c5b4f34e2)

---

## Troubleshooting

### Wallet Won't Connect
- Ensure Xverse extension is installed
- Try refreshing the page
- Check browser console for errors

### Signature Fails
- Ensure correct network (Bitcoin mainnet)
- Try disconnecting and reconnecting wallet

### Credential Issuance Fails
- Check `.env.local` has valid Starknet private key
- Check AWS credentials are set
- Check network connectivity to Starknet Sepolia

### Verification Shows Invalid
- Double-check credential ID (copy full string)
- Ensure the credential was actually issued (check transaction)

---

## Demo Checklist

Before starting the demo:

- [ ] Frontend running (`npm run dev`)
- [ ] Xverse wallet installed and unlocked
- [ ] `.env.local` configured with all keys
- [ ] Starkscan tab ready
- [ ] Good internet connection
- [ ] Browser console open (for debugging if needed)

---

## Key Messages

1. **Privacy First**: "Prove your tier, not your wallet"
2. **User Friendly**: "Just chat - no technical knowledge needed"
3. **Fully On-Chain**: "Credentials live on Starknet, verifiable by anyone"
4. **Interoperable**: "Use credentials across any dApp that integrates"

---

## Q&A Prep

**Q: Why Starknet?**
> "Starknet's low fees make credential issuance affordable, and Cairo's type safety ensures contract correctness."

**Q: How is privacy preserved?**
> "We store a hash of the wallet address, never the actual address. Only the tier is publicly visible."

**Q: Can credentials be revoked?**
> "Yes, the contract owner can revoke credentials if needed."

**Q: What's the real-world use case?**
> "Whale-only airdrops, tiered access to communities, credit scoring without doxxing, reputation systems."

**Q: How do you determine the tier?**
> "Currently using mock data for the hackathon. In production, we'd integrate a BTC balance oracle or use signed attestations."

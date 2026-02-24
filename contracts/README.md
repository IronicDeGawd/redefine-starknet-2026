# ZKCred Smart Contracts

Cairo contracts for the ZKCred credential system on Starknet.

## Prerequisites

- [Scarb](https://docs.swmansion.com/scarb/download.html) v2.15.2+
- [Starknet Foundry](https://foundry-rs.github.io/starknet-foundry/) v0.56.0+
- [Universal Sierra Compiler](https://github.com/software-mansion/universal-sierra-compiler)
- Rust (for snforge dependencies)

## Build

```bash
scarb build
```

## Test

```bash
snforge test
```

## Deployment

### 1. Create a Starknet Account

First, create an OpenZeppelin account for deployment:

```bash
# Create a new account
sncast account create --name deployer --type oz --network sepolia

# The output will show the address and salt. Fund this address with ETH from the Starknet Sepolia faucet:
# https://starknet-faucet.vercel.app/

# Deploy the account after funding
sncast account deploy --name deployer --network sepolia --max-fee 0.001
```

### 2. Declare Contracts

```bash
# Declare CredentialRegistry
sncast --account deployer declare --network sepolia --contract-name CredentialRegistry

# Save the Class Hash from output, then declare CredentialVerifier
sncast --account deployer declare --network sepolia --contract-name CredentialVerifier
```

### 3. Deploy Contracts

```bash
# Deploy CredentialRegistry with owner address
# Replace <OWNER_ADDRESS> with your account address
sncast --account deployer --wait deploy \
  --class-hash <REGISTRY_CLASS_HASH> \
  --arguments "<OWNER_ADDRESS>" \
  --network sepolia

# Deploy CredentialVerifier with registry address
sncast --account deployer --wait deploy \
  --class-hash <VERIFIER_CLASS_HASH> \
  --arguments "<REGISTRY_CONTRACT_ADDRESS>" \
  --network sepolia
```

### 4. Update Environment Variables

Update the `.env` files in both `contracts/` and `frontend/` with the new contract addresses:

```bash
CREDENTIAL_REGISTRY_ADDRESS=<deployed_registry_address>
CREDENTIAL_VERIFIER_ADDRESS=<deployed_verifier_address>
```

## Current Deployment (Sepolia Testnet)

| Contract | Address |
|----------|---------|
| CredentialRegistry | `0x073566a1fcb9f4f7ca7a0f8d0e056929c59ccf435b8ae88ca1a39251bfeed216` |
| CredentialVerifier | `0x07d69c729df6c1ac6d2c011a6e740fb23ea924928dcacb8f2f1a6c6c5b4f34e2` |
| Owner Account | `0x07fc0b2781635bb9d2f71816433e674837e46c9aa451056e193c1e02aa9daa69` |

View on Starkscan:
- [CredentialRegistry](https://sepolia.starkscan.co/contract/0x073566a1fcb9f4f7ca7a0f8d0e056929c59ccf435b8ae88ca1a39251bfeed216)
- [CredentialVerifier](https://sepolia.starkscan.co/contract/0x07d69c729df6c1ac6d2c011a6e740fb23ea924928dcacb8f2f1a6c6c5b4f34e2)

## Contract Architecture

### CredentialRegistry

Main contract for issuing and managing credentials:
- `issue_credential` - Issue a new credential (anyone)
- `revoke_credential` - Revoke a credential (owner only)
- `get_credential` - Get credential details
- `verify_tier` - Verify credential meets minimum tier
- `is_issued` - Check if pubkey already has credential type

Admin functions (owner only):
- `pause` / `unpause` - Pause/unpause contract
- `transfer_ownership` - Transfer contract ownership

### CredentialVerifier

Helper contract for common verification patterns:
- `is_whale` - Check if tier 3 (100+ BTC)
- `is_fish_or_above` - Check if tier 2+ (10+ BTC)
- `is_crab_or_above` - Check if tier 1+ (1+ BTC)
- `is_holder` - Check if credential exists and is active
- `get_tier` - Get credential tier
- `batch_verify` - Verify multiple credentials (max 100)

## Tier System

| Tier | Name | BTC Balance |
|------|------|-------------|
| 0 | Shrimp | < 1 BTC |
| 1 | Crab | 1-10 BTC |
| 2 | Fish | 10-100 BTC |
| 3 | Whale | 100+ BTC |

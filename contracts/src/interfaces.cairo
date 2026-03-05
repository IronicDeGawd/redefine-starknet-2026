use starknet::ContractAddress;

/// Credential data stored on-chain
#[derive(Drop, Copy, Serde, starknet::Store, PartialEq)]
pub struct Credential {
    /// Poseidon hash of the user's public key / identifier (privacy: don't store raw data)
    pub pubkey_hash: felt252,
    /// Type identifier: 'btc_tier', 'wallet_age', 'github_dev', 'steam_gamer',
    /// 'codeforces_coder', 'eth_holder', 'strava_athlete'
    pub credential_type: felt252,
    /// Tier level: 0-3
    pub tier: u8,
    /// Unix timestamp when credential was issued
    pub issued_at: u64,
    /// [L-1] Unix timestamp when credential expires (0 = never expires)
    pub expires_at: u64,
    /// Whether the credential has been revoked
    pub revoked: bool,
    /// SHA-256 hash of the oracle/API verification data
    pub verification_hash: felt252,
    /// Identifier of the oracle/API provider used (e.g., 'mempool', 'github', 'leetcode')
    pub oracle_provider: felt252,
    /// Poseidon commitment: H(pubkey_hash, credential_type, tier, verification_hash, salt)
    /// Cryptographically binds the credential data — tamper-evident
    pub commitment: felt252,
}

/// Interface for the CredentialRegistry contract
#[starknet::interface]
pub trait ICredentialRegistry<TContractState> {
    /// Issue a new credential with cryptographic commitment
    fn issue_credential(
        ref self: TContractState,
        pubkey_hash: felt252,
        credential_type: felt252,
        tier: u8,
        salt: felt252,
        verification_hash: felt252,
        oracle_provider: felt252,
        commitment: felt252,
    ) -> felt252;

    /// Verify a commitment matches the stored credential data
    /// Recomputes Poseidon(pubkey_hash, credential_type, tier, verification_hash, salt)
    fn verify_commitment(
        self: @TContractState,
        credential_id: felt252,
        pubkey_hash: felt252,
        credential_type: felt252,
        tier: u8,
        verification_hash: felt252,
        salt: felt252,
    ) -> bool;

    /// Revoke an existing credential
    fn revoke_credential(ref self: TContractState, credential_id: felt252);

    /// Get credential details by ID
    fn get_credential(self: @TContractState, credential_id: felt252) -> Credential;

    /// Check if a pubkey hash already has a credential of given type
    fn is_issued(self: @TContractState, pubkey_hash: felt252, credential_type: felt252) -> bool;

    /// Verify that a credential meets a minimum tier
    fn verify_tier(self: @TContractState, credential_id: felt252, min_tier: u8) -> bool;

    /// Get the contract owner address
    fn get_owner(self: @TContractState) -> ContractAddress;

    /// Get total number of credentials issued
    fn get_total_issued(self: @TContractState) -> u256;

    /// Check if contract is paused
    fn is_paused(self: @TContractState) -> bool;
}

/// Admin interface for the CredentialRegistry contract
#[starknet::interface]
pub trait ICredentialRegistryAdmin<TContractState> {
    fn pause(ref self: TContractState);
    fn unpause(ref self: TContractState);
    fn transfer_ownership(ref self: TContractState, new_owner: ContractAddress);
}

/// Interface for the CredentialVerifier helper contract
#[starknet::interface]
pub trait ICredentialVerifier<TContractState> {
    fn is_whale(self: @TContractState, credential_id: felt252) -> bool;
    fn is_fish_or_above(self: @TContractState, credential_id: felt252) -> bool;
    fn is_crab_or_above(self: @TContractState, credential_id: felt252) -> bool;
    fn is_holder(self: @TContractState, credential_id: felt252) -> bool;
    /// [M-3 FIX] Returns (exists: bool, tier: u8) to distinguish nonexistent from tier-0
    fn get_tier(self: @TContractState, credential_id: felt252) -> (bool, u8);
    fn batch_verify(
        self: @TContractState, credential_ids: Array<felt252>, min_tier: u8,
    ) -> Array<bool>;
}

/// Badge data stored per NFT token
#[derive(Drop, Copy, Serde, starknet::Store, PartialEq)]
pub struct BadgeData {
    pub credential_type: felt252,
    pub tier: u8,
    pub credential_id: felt252,
}

/// Interface for the BadgeNFT contract (lean ERC-721)
#[starknet::interface]
pub trait IBadgeNFT<TContractState> {
    /// Mint a badge NFT for a verified credential
    fn mint(ref self: TContractState, recipient: ContractAddress, credential_id: felt252) -> u256;

    /// Get the owner of a token
    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;

    /// Get the number of tokens owned by an address
    fn balance_of(self: @TContractState, owner: ContractAddress) -> u256;

    /// Get badge data (credential_type, tier) for a token
    fn get_badge_data(self: @TContractState, token_id: u256) -> (felt252, u8);

    /// Check if a credential already has a minted badge
    fn has_badge(self: @TContractState, credential_id: felt252) -> bool;

    /// Get total supply of minted badges
    fn get_total_supply(self: @TContractState) -> u256;

    /// Get the base URI for metadata
    fn get_base_uri(self: @TContractState) -> ByteArray;

    /// Set the base URI (owner only)
    fn set_base_uri(ref self: TContractState, new_base_uri: ByteArray);

    /// Get the contract owner
    fn get_owner(self: @TContractState) -> ContractAddress;

    /// Transfer ownership (owner only)
    fn transfer_ownership(ref self: TContractState, new_owner: ContractAddress);
}

/// Interface for the Merkle Tree Accumulator
#[starknet::interface]
pub trait ICredentialMerkle<TContractState> {
    /// Insert a credential commitment as a leaf, returns the leaf index
    fn insert_leaf(ref self: TContractState, commitment: felt252) -> u32;

    /// Get the current Merkle root
    fn get_root(self: @TContractState) -> felt252;

    /// Verify a Merkle inclusion proof on-chain
    fn verify_proof(
        self: @TContractState,
        leaf: felt252,
        proof: Array<felt252>,
        index: u32,
    ) -> bool;

    /// Get total leaves inserted
    fn get_leaf_count(self: @TContractState) -> u32;

    /// Get the contract owner address
    fn get_owner(self: @TContractState) -> ContractAddress;
}

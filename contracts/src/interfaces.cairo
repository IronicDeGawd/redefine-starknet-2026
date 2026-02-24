use starknet::ContractAddress;

/// Credential data stored on-chain
#[derive(Drop, Copy, Serde, starknet::Store, PartialEq)]
pub struct Credential {
    /// Poseidon hash of the BTC public key (privacy: don't store raw pubkey)
    pub pubkey_hash: felt252,
    /// Type identifier: 'btc_tier' or 'wallet_age'
    pub credential_type: felt252,
    /// Tier level: 0=Shrimp, 1=Crab, 2=Fish, 3=Whale
    pub tier: u8,
    /// Unix timestamp when credential was issued
    pub issued_at: u64,
    /// Whether the credential has been revoked
    pub revoked: bool,
}

/// Interface for the CredentialRegistry contract
#[starknet::interface]
pub trait ICredentialRegistry<TContractState> {
    /// Issue a new credential
    ///
    /// # Arguments
    /// * `pubkey_hash` - Poseidon hash of the BTC public key
    /// * `credential_type` - Type identifier (e.g., 'btc_tier')
    /// * `tier` - Tier level (0-3)
    /// * `salt` - Random salt for credential ID generation
    ///
    /// # Returns
    /// * `felt252` - The generated credential ID
    fn issue_credential(
        ref self: TContractState,
        pubkey_hash: felt252,
        credential_type: felt252,
        tier: u8,
        salt: felt252,
    ) -> felt252;

    /// Revoke an existing credential
    ///
    /// # Arguments
    /// * `credential_id` - The credential to revoke
    fn revoke_credential(ref self: TContractState, credential_id: felt252);

    /// Get credential details by ID
    ///
    /// # Arguments
    /// * `credential_id` - The credential ID to look up
    ///
    /// # Returns
    /// * `Credential` - The credential data (pubkey_hash=0 if not found)
    fn get_credential(self: @TContractState, credential_id: felt252) -> Credential;

    /// Check if a pubkey hash already has a credential of given type
    ///
    /// # Arguments
    /// * `pubkey_hash` - The pubkey hash to check
    /// * `credential_type` - The credential type to check
    ///
    /// # Returns
    /// * `bool` - True if already issued
    fn is_issued(self: @TContractState, pubkey_hash: felt252, credential_type: felt252) -> bool;

    /// Verify that a credential meets a minimum tier
    ///
    /// # Arguments
    /// * `credential_id` - The credential to verify
    /// * `min_tier` - Minimum tier required
    ///
    /// # Returns
    /// * `bool` - True if credential exists, is active, and meets tier
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
    /// Pause the contract (owner only)
    fn pause(ref self: TContractState);

    /// Unpause the contract (owner only)
    fn unpause(ref self: TContractState);

    /// Transfer ownership to a new address (owner only)
    fn transfer_ownership(ref self: TContractState, new_owner: ContractAddress);
}

/// Interface for the CredentialVerifier helper contract
#[starknet::interface]
pub trait ICredentialVerifier<TContractState> {
    /// Check if credential is Whale tier (100+ BTC)
    fn is_whale(self: @TContractState, credential_id: felt252) -> bool;

    /// Check if credential is Fish tier or above (10+ BTC)
    fn is_fish_or_above(self: @TContractState, credential_id: felt252) -> bool;

    /// Check if credential is Crab tier or above (1+ BTC)
    fn is_crab_or_above(self: @TContractState, credential_id: felt252) -> bool;

    /// Check if credential exists and is active (any tier)
    fn is_holder(self: @TContractState, credential_id: felt252) -> bool;

    /// Get the tier of a credential
    fn get_tier(self: @TContractState, credential_id: felt252) -> u8;

    /// Batch verify multiple credentials against a minimum tier
    fn batch_verify(
        self: @TContractState, credential_ids: Array<felt252>, min_tier: u8,
    ) -> Array<bool>;
}

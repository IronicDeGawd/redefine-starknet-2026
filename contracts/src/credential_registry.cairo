/// CredentialRegistry - Main contract for ZKCred credential management
///
/// This contract handles issuing, storing, and revoking privacy-preserving
/// credentials for Bitcoin holders on Starknet.

#[starknet::contract]
pub mod CredentialRegistry {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use core::poseidon::poseidon_hash_span;
    use crate::interfaces::{ICredentialRegistry, Credential};

    // ============ Storage ============

    #[storage]
    struct Storage {
        /// Mapping: credential_id => Credential
        credentials: LegacyMap<felt252, Credential>,
        /// Mapping: (pubkey_hash, credential_type) hash => has_credential
        issued_pubkeys: LegacyMap<felt252, bool>,
        /// Mapping: (pubkey_hash, credential_type) hash => credential_id
        pubkey_to_credential: LegacyMap<felt252, felt252>,
        /// Total credentials issued
        total_issued: u256,
        /// Contract owner
        owner: ContractAddress,
        /// Pause state
        paused: bool,
    }

    // ============ Events ============

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        CredentialIssued: CredentialIssued,
        CredentialRevoked: CredentialRevoked,
        OwnershipTransferred: OwnershipTransferred,
        Paused: Paused,
        Unpaused: Unpaused,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CredentialIssued {
        #[key]
        pub credential_id: felt252,
        pub credential_type: felt252,
        pub tier: u8,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CredentialRevoked {
        #[key]
        pub credential_id: felt252,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct OwnershipTransferred {
        pub previous_owner: ContractAddress,
        pub new_owner: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Paused {
        pub account: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Unpaused {
        pub account: ContractAddress,
    }

    // ============ Errors ============

    pub mod Errors {
        pub const ALREADY_ISSUED: felt252 = 'Credential already issued';
        pub const NOT_FOUND: felt252 = 'Credential not found';
        pub const ALREADY_REVOKED: felt252 = 'Already revoked';
        pub const INVALID_TIER: felt252 = 'Invalid tier (must be 0-3)';
        pub const INVALID_TYPE: felt252 = 'Invalid credential type';
        pub const PAUSED: felt252 = 'Contract is paused';
        pub const NOT_OWNER: felt252 = 'Caller is not owner';
        pub const ZERO_ADDRESS: felt252 = 'Zero address not allowed';
    }

    // ============ Constructor ============

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        assert(!owner.is_zero(), Errors::ZERO_ADDRESS);
        self.owner.write(owner);
        self.paused.write(false);
        self.total_issued.write(0);
    }

    // ============ External Functions ============

    #[abi(embed_v0)]
    impl CredentialRegistryImpl of ICredentialRegistry<ContractState> {
        fn issue_credential(
            ref self: ContractState,
            pubkey_hash: felt252,
            credential_type: felt252,
            tier: u8,
            salt: felt252,
        ) -> felt252 {
            // Check not paused
            assert(!self.paused.read(), Errors::PAUSED);

            // Validate tier (0-3)
            assert(tier <= 3, Errors::INVALID_TIER);

            // Validate credential type
            assert(
                credential_type == 'btc_tier' || credential_type == 'wallet_age',
                Errors::INVALID_TYPE,
            );

            // Compute type key: hash(pubkey_hash, credential_type)
            let type_key = poseidon_hash_span(array![pubkey_hash, credential_type].span());

            // Check not already issued for this pubkey + type
            assert(!self.issued_pubkeys.read(type_key), Errors::ALREADY_ISSUED);

            // Generate credential ID: hash(pubkey_hash, type, tier, salt)
            let credential_id = poseidon_hash_span(
                array![pubkey_hash, credential_type, tier.into(), salt].span(),
            );

            // Get current timestamp
            let timestamp = get_block_timestamp();

            // Create credential
            let credential = Credential {
                pubkey_hash,
                credential_type,
                tier,
                issued_at: timestamp,
                revoked: false,
            };

            // Store credential
            self.credentials.write(credential_id, credential);
            self.issued_pubkeys.write(type_key, true);
            self.pubkey_to_credential.write(type_key, credential_id);

            // Increment counter
            let current_total = self.total_issued.read();
            self.total_issued.write(current_total + 1);

            // Emit event
            self.emit(CredentialIssued { credential_id, credential_type, tier, timestamp });

            credential_id
        }

        fn revoke_credential(ref self: ContractState, credential_id: felt252) {
            // Check not paused
            assert(!self.paused.read(), Errors::PAUSED);

            // Get credential
            let mut credential = self.credentials.read(credential_id);

            // Check exists (pubkey_hash != 0)
            assert(credential.pubkey_hash != 0, Errors::NOT_FOUND);

            // Check not already revoked
            assert(!credential.revoked, Errors::ALREADY_REVOKED);

            // Mark as revoked
            credential.revoked = true;
            self.credentials.write(credential_id, credential);

            // Emit event
            self.emit(CredentialRevoked { credential_id, timestamp: get_block_timestamp() });
        }

        fn get_credential(self: @ContractState, credential_id: felt252) -> Credential {
            self.credentials.read(credential_id)
        }

        fn is_issued(
            self: @ContractState, pubkey_hash: felt252, credential_type: felt252,
        ) -> bool {
            let type_key = poseidon_hash_span(array![pubkey_hash, credential_type].span());
            self.issued_pubkeys.read(type_key)
        }

        fn verify_tier(self: @ContractState, credential_id: felt252, min_tier: u8) -> bool {
            let credential = self.credentials.read(credential_id);

            // Check: exists AND not revoked AND meets tier
            credential.pubkey_hash != 0 && !credential.revoked && credential.tier >= min_tier
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }

        fn get_total_issued(self: @ContractState) -> u256 {
            self.total_issued.read()
        }

        fn is_paused(self: @ContractState) -> bool {
            self.paused.read()
        }
    }

    // ============ Admin Functions ============

    #[generate_trait]
    pub impl AdminImpl of AdminTrait {
        fn pause(ref self: ContractState) {
            self._only_owner();
            assert(!self.paused.read(), 'Already paused');
            self.paused.write(true);
            self.emit(Paused { account: get_caller_address() });
        }

        fn unpause(ref self: ContractState) {
            self._only_owner();
            assert(self.paused.read(), 'Not paused');
            self.paused.write(false);
            self.emit(Unpaused { account: get_caller_address() });
        }

        fn transfer_ownership(ref self: ContractState, new_owner: ContractAddress) {
            self._only_owner();
            assert(!new_owner.is_zero(), Errors::ZERO_ADDRESS);
            let previous_owner = self.owner.read();
            self.owner.write(new_owner);
            self.emit(OwnershipTransferred { previous_owner, new_owner });
        }
    }

    // ============ Internal Functions ============

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _only_owner(self: @ContractState) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), Errors::NOT_OWNER);
        }
    }
}

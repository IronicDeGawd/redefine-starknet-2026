/// CredentialRegistry - Main contract for ZKCred credential management
/// Supports 7 credential types with cryptographic commitment binding

#[starknet::contract]
pub mod CredentialRegistry {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess,
        StorageMapWriteAccess, Map,
    };
    use core::poseidon::poseidon_hash_span;
    use core::num::traits::Zero;
    use crate::interfaces::{ICredentialRegistry, ICredentialRegistryAdmin, Credential};

    // ============ Storage ============

    #[storage]
    struct Storage {
        credentials: Map<felt252, Credential>,
        issued_pubkeys: Map<felt252, bool>,
        pubkey_to_credential: Map<felt252, felt252>,
        total_issued: u256,
        owner: ContractAddress,
        paused: bool,
    }

    // ============ Events ============

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        CredentialIssued: CredentialIssued,
        CredentialRevoked: CredentialRevoked,
        CommitmentVerified: CommitmentVerified,
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
        pub verification_hash: felt252,
        pub oracle_provider: felt252,
        pub commitment: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CredentialRevoked {
        #[key]
        pub credential_id: felt252,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CommitmentVerified {
        #[key]
        pub credential_id: felt252,
        pub verified: bool,
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
        pub const INVALID_PUBKEY: felt252 = 'Zero pubkey_hash not allowed';
        pub const PAUSED: felt252 = 'Contract is paused';
        pub const NOT_OWNER: felt252 = 'Caller is not owner';
        pub const ZERO_ADDRESS: felt252 = 'Zero address not allowed';
    }

    // ============ Constructor ============

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        assert(owner.is_non_zero(), Errors::ZERO_ADDRESS);
        self.owner.write(owner);
        self.paused.write(false);
        self.total_issued.write(0);
    }

    // ============ Internal: Credential Type Validation ============

    fn is_valid_credential_type(credential_type: felt252) -> bool {
        credential_type == 'btc_tier'
            || credential_type == 'wallet_age'
            || credential_type == 'github_dev'
            || credential_type == 'steam_gamer'
            || credential_type == 'codeforces_coder'
            || credential_type == 'eth_holder'
            || credential_type == 'strava_athlete'
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
            verification_hash: felt252,
            oracle_provider: felt252,
            commitment: felt252,
        ) -> felt252 {
            // [C-1 FIX] Only owner (oracle server) can issue credentials
            self._only_owner();
            assert(!self.paused.read(), Errors::PAUSED);
            // [M-1 FIX] Reject zero pubkey_hash to prevent invisible credentials
            assert(pubkey_hash != 0, Errors::INVALID_PUBKEY);
            assert(tier <= 3, Errors::INVALID_TIER);
            assert(is_valid_credential_type(credential_type), Errors::INVALID_TYPE);

            let type_key = poseidon_hash_span(array![pubkey_hash, credential_type].span());
            assert(!self.issued_pubkeys.read(type_key), Errors::ALREADY_ISSUED);

            let credential_id = poseidon_hash_span(
                array![pubkey_hash, credential_type, tier.into(), salt].span(),
            );

            // [H-1 FIX] Compute commitment internally — don't trust caller-supplied value
            let computed_commitment = poseidon_hash_span(
                array![pubkey_hash, credential_type, tier.into(), verification_hash, salt].span(),
            );
            // If caller passed a commitment, verify it matches (defense in depth)
            // If commitment is 0, use the computed one (backward compat)
            let final_commitment = if commitment != 0 {
                assert(commitment == computed_commitment, 'Commitment mismatch');
                computed_commitment
            } else {
                computed_commitment
            };

            let timestamp = get_block_timestamp();
            let credential = Credential {
                pubkey_hash,
                credential_type,
                tier,
                issued_at: timestamp,
                expires_at: 0, // [L-1] 0 = never expires; can be set via future update
                revoked: false,
                verification_hash,
                oracle_provider,
                commitment: final_commitment,
            };

            self.credentials.write(credential_id, credential);
            self.issued_pubkeys.write(type_key, true);
            self.pubkey_to_credential.write(type_key, credential_id);

            let current_total = self.total_issued.read();
            self.total_issued.write(current_total + 1);

            self.emit(CredentialIssued {
                credential_id,
                credential_type,
                tier,
                timestamp,
                verification_hash,
                oracle_provider,
                commitment: final_commitment,
            });

            credential_id
        }

        fn verify_commitment(
            self: @ContractState,
            credential_id: felt252,
            pubkey_hash: felt252,
            credential_type: felt252,
            tier: u8,
            verification_hash: felt252,
            salt: felt252,
        ) -> bool {
            let credential = self.credentials.read(credential_id);
            if credential.pubkey_hash == 0 {
                return false;
            }

            // Recompute the commitment from the provided preimage
            let recomputed = poseidon_hash_span(
                array![pubkey_hash, credential_type, tier.into(), verification_hash, salt].span(),
            );

            // Compare with stored commitment
            recomputed == credential.commitment
        }

        fn revoke_credential(ref self: ContractState, credential_id: felt252) {
            self._only_owner();
            assert(!self.paused.read(), Errors::PAUSED);

            let mut credential = self.credentials.read(credential_id);
            assert(credential.pubkey_hash != 0, Errors::NOT_FOUND);
            assert(!credential.revoked, Errors::ALREADY_REVOKED);

            credential.revoked = true;
            self.credentials.write(credential_id, credential);

            // [H-2 FIX] Clear issuance flag so user can re-issue after revocation
            let type_key = poseidon_hash_span(
                array![credential.pubkey_hash, credential.credential_type].span(),
            );
            self.issued_pubkeys.write(type_key, false);
            self.pubkey_to_credential.write(type_key, 0);

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
            if credential.pubkey_hash == 0 || credential.revoked {
                return false;
            }
            // [L-1] Check expiry if set (0 = never expires)
            if credential.expires_at != 0 {
                let now = get_block_timestamp();
                if now > credential.expires_at {
                    return false;
                }
            }
            credential.tier >= min_tier
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

    #[abi(embed_v0)]
    impl AdminImpl of ICredentialRegistryAdmin<ContractState> {
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
            assert(new_owner.is_non_zero(), Errors::ZERO_ADDRESS);
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

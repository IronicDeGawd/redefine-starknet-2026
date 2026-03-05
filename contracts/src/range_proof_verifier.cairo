/// RangeProofVerifier - Oracle-attested range proof verification
///
/// The oracle server (owner) verifies off-chain that a value falls within a tier's
/// range, computes a Pedersen commitment C = H(value, blinding), and submits ONLY
/// the commitment + tier claim on-chain. The value and blinding factor NEVER appear
/// in calldata, preserving privacy.
///
/// [C-2 FIX] Removed plaintext value/blinding from on-chain params
/// [H-3 FIX] Only owner can submit proofs (no unauthorized overwrites)
/// [H-5 FIX] Replaced 0-as-unbounded with explicit tier_unbounded flag

#[starknet::contract]
pub mod RangeProofVerifier {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess,
        StorageMapWriteAccess, Map,
    };
    use core::num::traits::Zero;

    /// Stored range proof record
    #[derive(Drop, Copy, Serde, starknet::Store)]
    struct RangeProof {
        /// The Pedersen commitment: C = H(value, blinding_factor)
        /// Computed off-chain by the oracle — preimage never goes on-chain
        commitment: felt252,
        /// Credential ID this proof is linked to
        credential_id: felt252,
        /// The tier that was proven (0-3)
        proven_tier: u8,
        /// Minimum value for the proven tier
        range_min: felt252,
        /// Maximum value for the proven tier
        range_max: felt252,
        /// Timestamp when proof was attested
        verified_at: u64,
        /// Whether the proof was successfully verified
        verified: bool,
    }

    // ============ Storage ============

    #[storage]
    struct Storage {
        /// Range proofs by credential ID
        proofs: Map<felt252, RangeProof>,
        /// Number of verified proofs
        total_proofs: u256,
        /// Contract owner (the oracle server)
        owner: ContractAddress,
        /// Tier boundaries: tier_level => min_value
        tier_min: Map<u8, felt252>,
        /// Tier boundaries: tier_level => max_value
        tier_max: Map<u8, felt252>,
        /// [H-5 FIX] Whether a tier has an unbounded upper limit
        tier_unbounded: Map<u8, bool>,
    }

    // ============ Events ============

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        RangeProofVerified: RangeProofVerified,
        TierBoundarySet: TierBoundarySet,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RangeProofVerified {
        #[key]
        pub credential_id: felt252,
        pub commitment: felt252,
        pub proven_tier: u8,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct TierBoundarySet {
        pub tier: u8,
        pub min_value: felt252,
        pub max_value: felt252,
        pub unbounded: bool,
    }

    // ============ Constructor ============

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        assert(owner.is_non_zero(), 'Zero address not allowed');
        self.owner.write(owner);
        self.total_proofs.write(0);

        // Default BTC tier boundaries (in satoshis)
        self.tier_min.write(0, 0);
        self.tier_max.write(0, 99999999);
        self.tier_unbounded.write(0, false);

        self.tier_min.write(1, 100000000);
        self.tier_max.write(1, 999999999);
        self.tier_unbounded.write(1, false);

        self.tier_min.write(2, 1000000000);
        self.tier_max.write(2, 9999999999);
        self.tier_unbounded.write(2, false);

        self.tier_min.write(3, 10000000000);
        self.tier_max.write(3, 0);
        self.tier_unbounded.write(3, true); // Tier 3 is unbounded
    }

    // ============ Internal ============

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _only_owner(self: @ContractState) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Caller is not owner');
        }
    }

    // ============ External Functions ============

    #[abi(embed_v0)]
    impl RangeProofVerifierImpl of super::IRangeProofVerifier<ContractState> {
        /// Submit an oracle-attested range proof
        ///
        /// [C-2 FIX] The oracle server (owner) performs verification off-chain:
        ///   1. Oracle obtains the real value (e.g., BTC balance)
        ///   2. Oracle checks value is in [tier_min, tier_max] for the claimed tier
        ///   3. Oracle computes commitment C = Pedersen(value, blinding)
        ///   4. Oracle submits ONLY (credential_id, commitment, tier) on-chain
        ///   5. The value and blinding_factor NEVER appear on-chain
        ///
        /// [H-3 FIX] Only owner can call — prevents unauthorized overwrites
        fn verify_range_proof(
            ref self: ContractState,
            credential_id: felt252,
            commitment: felt252,
            tier: u8,
        ) -> bool {
            // Only the oracle server can attest range proofs
            self._only_owner();
            assert(tier <= 3, 'Invalid tier');
            assert(commitment != 0, 'Empty commitment');

            // Look up the tier boundaries
            let range_min = self.tier_min.read(tier);
            let range_max = self.tier_max.read(tier);

            // Store the attested proof
            let timestamp = get_block_timestamp();
            let proof = RangeProof {
                commitment,
                credential_id,
                proven_tier: tier,
                range_min,
                range_max,
                verified_at: timestamp,
                verified: true,
            };

            // [M-2 FIX] Only increment counter for new proofs, not re-attestations
            let is_new = !self.proofs.read(credential_id).verified;
            self.proofs.write(credential_id, proof);
            if is_new {
                let current = self.total_proofs.read();
                self.total_proofs.write(current + 1);
            }

            self.emit(RangeProofVerified {
                credential_id,
                commitment,
                proven_tier: tier,
                timestamp,
            });

            true
        }

        /// Get a stored range proof by credential ID
        fn get_proof(self: @ContractState, credential_id: felt252) -> (bool, u8, felt252) {
            let proof = self.proofs.read(credential_id);
            (proof.verified, proof.proven_tier, proof.commitment)
        }

        /// Check if a credential has a verified range proof
        fn is_proven(self: @ContractState, credential_id: felt252) -> bool {
            self.proofs.read(credential_id).verified
        }

        /// Get total number of verified proofs
        fn get_total_proofs(self: @ContractState) -> u256 {
            self.total_proofs.read()
        }

        /// Get tier boundaries
        fn get_tier_bounds(self: @ContractState, tier: u8) -> (felt252, felt252) {
            (self.tier_min.read(tier), self.tier_max.read(tier))
        }

        /// Check if a tier has unbounded upper limit
        fn is_tier_unbounded(self: @ContractState, tier: u8) -> bool {
            self.tier_unbounded.read(tier)
        }

        /// Set tier boundaries (owner only)
        /// [H-5 FIX] Explicit unbounded flag — no ambiguity with 0
        fn set_tier_bounds(
            ref self: ContractState,
            tier: u8,
            min_value: felt252,
            max_value: felt252,
            unbounded: bool,
        ) {
            self._only_owner();
            assert(tier <= 3, 'Invalid tier');

            self.tier_min.write(tier, min_value);
            self.tier_max.write(tier, max_value);
            self.tier_unbounded.write(tier, unbounded);

            self.emit(TierBoundarySet { tier, min_value, max_value, unbounded });
        }

        /// Get the contract owner
        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }
    }
}

/// Interface for RangeProofVerifier
use starknet::ContractAddress;

#[starknet::interface]
pub trait IRangeProofVerifier<TContractState> {
    /// Oracle-attested range proof — no secrets on-chain
    fn verify_range_proof(
        ref self: TContractState,
        credential_id: felt252,
        commitment: felt252,
        tier: u8,
    ) -> bool;

    fn get_proof(self: @TContractState, credential_id: felt252) -> (bool, u8, felt252);
    fn is_proven(self: @TContractState, credential_id: felt252) -> bool;
    fn get_total_proofs(self: @TContractState) -> u256;
    fn get_tier_bounds(self: @TContractState, tier: u8) -> (felt252, felt252);
    fn is_tier_unbounded(self: @TContractState, tier: u8) -> bool;
    fn set_tier_bounds(
        ref self: TContractState, tier: u8, min_value: felt252, max_value: felt252, unbounded: bool,
    );
    fn get_owner(self: @TContractState) -> ContractAddress;
}

/// RangeProofVerifier - On-chain range proof verification using Pedersen commitments
/// Proves a value is within a range without revealing the exact value
/// Used for: "My balance puts me in Tier 2 (10-100 BTC)" without revealing actual balance

#[starknet::contract]
pub mod RangeProofVerifier {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess,
        StorageMapWriteAccess, Map,
    };
    use core::pedersen::PedersenTrait;
    use core::hash::HashStateTrait;
    use core::num::traits::Zero;

    // ============ Tier Boundaries ============
    // These define the ranges for each tier level
    // Tier 0: [0, TIER_1_MIN)
    // Tier 1: [TIER_1_MIN, TIER_2_MIN)
    // Tier 2: [TIER_2_MIN, TIER_3_MIN)
    // Tier 3: [TIER_3_MIN, ∞)

    /// Stored range proof record
    #[derive(Drop, Copy, Serde, starknet::Store)]
    struct RangeProof {
        /// The Pedersen commitment: C = H(value, blinding_factor)
        commitment: felt252,
        /// Credential ID this proof is linked to
        credential_id: felt252,
        /// The tier that was proven (0-3)
        proven_tier: u8,
        /// Minimum value for the proven tier
        range_min: felt252,
        /// Maximum value for the proven tier (0 = unbounded)
        range_max: felt252,
        /// Timestamp when proof was verified
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
        /// Contract owner
        owner: ContractAddress,
        /// Tier boundaries (tier_level => min_value)
        tier_min: Map<u8, felt252>,
        /// Tier boundaries (tier_level => max_value, 0 = unbounded)
        tier_max: Map<u8, felt252>,
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
    }

    // ============ Constructor ============

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        assert(owner.is_non_zero(), 'Zero address not allowed');
        self.owner.write(owner);
        self.total_proofs.write(0);

        // Default BTC tier boundaries (in satoshis)
        // Tier 0: 0 - 99,999,999 (< 1 BTC)
        // Tier 1: 100,000,000 - 999,999,999 (1-10 BTC)
        // Tier 2: 1,000,000,000 - 9,999,999,999 (10-100 BTC)
        // Tier 3: 10,000,000,000+ (100+ BTC)
        self.tier_min.write(0, 0);
        self.tier_max.write(0, 99999999);
        self.tier_min.write(1, 100000000);
        self.tier_max.write(1, 999999999);
        self.tier_min.write(2, 1000000000);
        self.tier_max.write(2, 9999999999);
        self.tier_min.write(3, 10000000000);
        self.tier_max.write(3, 0); // 0 = unbounded
    }

    // ============ External Functions ============

    #[abi(embed_v0)]
    impl RangeProofVerifierImpl of super::IRangeProofVerifier<ContractState> {
        /// Submit and verify a range proof
        /// The proof demonstrates that the committed value falls within [range_min, range_max]
        ///
        /// Simplified range proof scheme:
        /// 1. Prover computes commitment C = Pedersen(value, blinding_factor)
        /// 2. Prover provides: C, value, blinding_factor, credential_id, tier
        /// 3. Verifier checks: C == Pedersen(value, blinding_factor) AND value in [tier_min, tier_max]
        ///
        /// Note: In a full ZK implementation, the value and blinding_factor would NOT be revealed.
        /// This demonstrates the concept — a production system would use a proper ZK circuit (STARK/SNARK).
        fn verify_range_proof(
            ref self: ContractState,
            credential_id: felt252,
            commitment: felt252,
            value: felt252,
            blinding_factor: felt252,
            tier: u8,
        ) -> bool {
            assert(tier <= 3, 'Invalid tier');

            // 1. Verify the Pedersen commitment
            let computed_commitment = PedersenTrait::new(value)
                .update(blinding_factor)
                .finalize();

            if computed_commitment != commitment {
                return false;
            }

            // 2. Check value is within the tier's range
            let range_min = self.tier_min.read(tier);
            let range_max = self.tier_max.read(tier);

            // Value must be >= range_min
            // Using felt252 comparison (works for reasonable positive values)
            let value_u256: u256 = value.into();
            let min_u256: u256 = range_min.into();

            if value_u256 < min_u256 {
                return false;
            }

            // If range_max is non-zero, value must be <= range_max
            if range_max != 0 {
                let max_u256: u256 = range_max.into();
                if value_u256 > max_u256 {
                    return false;
                }
            }

            // 3. Store the verified proof
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

            self.proofs.write(credential_id, proof);
            let current = self.total_proofs.read();
            self.total_proofs.write(current + 1);

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

        /// Set tier boundaries (owner only)
        fn set_tier_bounds(
            ref self: ContractState,
            tier: u8,
            min_value: felt252,
            max_value: felt252,
        ) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Caller is not owner');
            assert(tier <= 3, 'Invalid tier');

            self.tier_min.write(tier, min_value);
            self.tier_max.write(tier, max_value);

            self.emit(TierBoundarySet { tier, min_value, max_value });
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
    fn verify_range_proof(
        ref self: TContractState,
        credential_id: felt252,
        commitment: felt252,
        value: felt252,
        blinding_factor: felt252,
        tier: u8,
    ) -> bool;

    fn get_proof(self: @TContractState, credential_id: felt252) -> (bool, u8, felt252);
    fn is_proven(self: @TContractState, credential_id: felt252) -> bool;
    fn get_total_proofs(self: @TContractState) -> u256;
    fn get_tier_bounds(self: @TContractState, tier: u8) -> (felt252, felt252);
    fn set_tier_bounds(ref self: TContractState, tier: u8, min_value: felt252, max_value: felt252);
    fn get_owner(self: @TContractState) -> ContractAddress;
}

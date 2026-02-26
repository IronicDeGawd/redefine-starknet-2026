/// CredentialMerkle - Poseidon Merkle Tree Accumulator for credential set membership proofs
/// Enables proving "I have a valid credential" without revealing which one

#[starknet::contract]
pub mod CredentialMerkle {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess,
        StorageMapWriteAccess, Map,
    };
    use core::poseidon::poseidon_hash_span;
    use core::num::traits::Zero;
    use crate::interfaces::ICredentialMerkle;

    // Tree depth of 20 supports ~1M credentials
    const TREE_DEPTH: u32 = 20;

    // ============ Storage ============

    #[storage]
    struct Storage {
        /// The current Merkle root
        root: felt252,
        /// Number of leaves inserted
        leaf_count: u32,
        /// Mapping: level => index => hash value
        /// This stores the entire tree for proof generation
        nodes: Map<(u32, u32), felt252>,
        /// Zero values for each level (precomputed empty subtree hashes)
        zeros: Map<u32, felt252>,
        /// Contract owner
        owner: ContractAddress,
    }

    // ============ Events ============

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        LeafInserted: LeafInserted,
        RootUpdated: RootUpdated,
    }

    #[derive(Drop, starknet::Event)]
    pub struct LeafInserted {
        #[key]
        pub index: u32,
        pub commitment: felt252,
        pub new_root: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RootUpdated {
        pub old_root: felt252,
        pub new_root: felt252,
    }

    // ============ Constructor ============

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        assert(owner.is_non_zero(), 'Zero address not allowed');
        self.owner.write(owner);
        self.leaf_count.write(0);

        // Precompute zero values for each level
        // Level 0 zero = 0 (empty leaf)
        // Level n zero = H(level n-1 zero, level n-1 zero)
        let mut current_zero: felt252 = 0;
        self.zeros.write(0, current_zero);

        let mut level: u32 = 1;
        while level <= TREE_DEPTH {
            current_zero = poseidon_hash_span(array![current_zero, current_zero].span());
            self.zeros.write(level, current_zero);
            level += 1;
        };

        // Initial root is the zero value at the top
        self.root.write(current_zero);
    }

    // ============ External Functions ============

    #[abi(embed_v0)]
    impl CredentialMerkleImpl of ICredentialMerkle<ContractState> {
        fn insert_leaf(ref self: ContractState, commitment: felt252) -> u32 {
            // Only owner can insert (called by the registry contract or admin)
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Caller is not owner');

            let index = self.leaf_count.read();
            let max_leaves: u32 = 1048576; // 2^20
            assert(index < max_leaves, 'Tree is full');

            let old_root = self.root.read();

            // Insert leaf at level 0
            self.nodes.write((0, index), commitment);

            // Update path from leaf to root
            let mut current_hash = commitment;
            let mut current_index = index;
            let mut level: u32 = 0;

            while level < TREE_DEPTH {
                let parent_index = current_index / 2;
                let is_left = current_index % 2 == 0;

                let (left, right) = if is_left {
                    // We're the left child, get the right sibling
                    let right_sibling = self.nodes.read((level, current_index + 1));
                    // [H-4 FIX] Use zero-hash if sibling is empty
                    let right_val = if right_sibling == 0 {
                        self.zeros.read(level)
                    } else {
                        right_sibling
                    };
                    (current_hash, right_val)
                } else {
                    // We're the right child, get the left sibling
                    let left_sibling = self.nodes.read((level, current_index - 1));
                    // [H-4 FIX] Symmetric zero-hash substitution for left branch
                    let left_val = if left_sibling == 0 {
                        self.zeros.read(level)
                    } else {
                        left_sibling
                    };
                    (left_val, current_hash)
                };

                current_hash = poseidon_hash_span(array![left, right].span());
                self.nodes.write((level + 1, parent_index), current_hash);

                current_index = parent_index;
                level += 1;
            };

            // Update root and leaf count
            self.root.write(current_hash);
            self.leaf_count.write(index + 1);

            self.emit(LeafInserted { index, commitment, new_root: current_hash });
            self.emit(RootUpdated { old_root, new_root: current_hash });

            index
        }

        fn get_root(self: @ContractState) -> felt252 {
            self.root.read()
        }

        fn verify_proof(
            self: @ContractState,
            leaf: felt252,
            proof: Array<felt252>,
            index: u32,
        ) -> bool {
            assert(proof.len() == TREE_DEPTH, 'Invalid proof length');
            // [C-3 FIX] Reject proofs for indices beyond the frontier
            assert(index < self.leaf_count.read(), 'Index out of range');

            let mut current_hash = leaf;
            let mut current_index = index;
            let mut level: u32 = 0;

            while level < TREE_DEPTH {
                let sibling = *proof.at(level);

                let is_left = current_index % 2 == 0;
                current_hash = if is_left {
                    poseidon_hash_span(array![current_hash, sibling].span())
                } else {
                    poseidon_hash_span(array![sibling, current_hash].span())
                };

                current_index = current_index / 2;
                level += 1;
            };

            current_hash == self.root.read()
        }

        fn get_leaf_count(self: @ContractState) -> u32 {
            self.leaf_count.read()
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }
    }
}

/// CredentialVerifier - Helper contract for third-party credential verification
///
/// This contract provides convenient methods for verifying credentials
/// against specific tier requirements. DeFi protocols and dApps can
/// use this to gate access based on BTC holdings.

#[starknet::contract]
pub mod CredentialVerifier {
    use starknet::ContractAddress;
    use crate::interfaces::{
        ICredentialVerifier, ICredentialRegistryDispatcher, ICredentialRegistryDispatcherTrait,
    };

    // ============ Storage ============

    #[storage]
    struct Storage {
        /// Address of the CredentialRegistry contract
        registry_address: ContractAddress,
    }

    // ============ Constructor ============

    #[constructor]
    fn constructor(ref self: ContractState, registry: ContractAddress) {
        assert(!registry.is_zero(), 'Registry address cannot be zero');
        self.registry_address.write(registry);
    }

    // ============ External Functions ============

    #[abi(embed_v0)]
    impl CredentialVerifierImpl of ICredentialVerifier<ContractState> {
        /// Check if credential is Whale tier (100+ BTC)
        fn is_whale(self: @ContractState, credential_id: felt252) -> bool {
            let registry = self._get_registry();
            registry.verify_tier(credential_id, 3)
        }

        /// Check if credential is Fish tier or above (10+ BTC)
        fn is_fish_or_above(self: @ContractState, credential_id: felt252) -> bool {
            let registry = self._get_registry();
            registry.verify_tier(credential_id, 2)
        }

        /// Check if credential is Crab tier or above (1+ BTC)
        fn is_crab_or_above(self: @ContractState, credential_id: felt252) -> bool {
            let registry = self._get_registry();
            registry.verify_tier(credential_id, 1)
        }

        /// Check if credential exists and is active (any tier, including Shrimp)
        fn is_holder(self: @ContractState, credential_id: felt252) -> bool {
            let registry = self._get_registry();
            registry.verify_tier(credential_id, 0)
        }

        /// Get the tier of a credential (returns 0 if not found/revoked)
        fn get_tier(self: @ContractState, credential_id: felt252) -> u8 {
            let registry = self._get_registry();
            let credential = registry.get_credential(credential_id);

            // Return 0 if credential doesn't exist or is revoked
            if credential.pubkey_hash == 0 || credential.revoked {
                return 0;
            }

            credential.tier
        }

        /// Batch verify multiple credentials against a minimum tier
        ///
        /// # Arguments
        /// * `credential_ids` - Array of credential IDs to verify
        /// * `min_tier` - Minimum tier required for each
        ///
        /// # Returns
        /// * `Array<bool>` - Array of verification results
        fn batch_verify(
            self: @ContractState, credential_ids: Array<felt252>, min_tier: u8,
        ) -> Array<bool> {
            let registry = self._get_registry();
            let mut results: Array<bool> = ArrayTrait::new();

            let mut i: u32 = 0;
            let len = credential_ids.len();

            while i < len {
                let id = *credential_ids.at(i);
                let valid = registry.verify_tier(id, min_tier);
                results.append(valid);
                i += 1;
            };

            results
        }
    }

    // ============ View Functions ============

    #[generate_trait]
    pub impl ViewImpl of ViewTrait {
        /// Get the registry contract address
        fn get_registry_address(self: @ContractState) -> ContractAddress {
            self.registry_address.read()
        }
    }

    // ============ Internal Functions ============

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _get_registry(self: @ContractState) -> ICredentialRegistryDispatcher {
            ICredentialRegistryDispatcher { contract_address: self.registry_address.read() }
        }
    }
}

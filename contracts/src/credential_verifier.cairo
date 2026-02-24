/// CredentialVerifier - Helper contract for third-party credential verification

#[starknet::contract]
pub mod CredentialVerifier {
    use starknet::ContractAddress;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use core::num::traits::Zero;
    use crate::interfaces::{
        ICredentialVerifier, ICredentialRegistryDispatcher, ICredentialRegistryDispatcherTrait,
    };

    // ============ Constants ============

    const MAX_BATCH_SIZE: u32 = 100;

    // ============ Storage ============

    #[storage]
    struct Storage {
        registry_address: ContractAddress,
    }

    // ============ Constructor ============

    #[constructor]
    fn constructor(ref self: ContractState, registry: ContractAddress) {
        assert(registry.is_non_zero(), 'Registry address cannot be zero');
        self.registry_address.write(registry);
    }

    // ============ External Functions ============

    #[abi(embed_v0)]
    impl CredentialVerifierImpl of ICredentialVerifier<ContractState> {
        fn is_whale(self: @ContractState, credential_id: felt252) -> bool {
            let registry = self._get_registry();
            registry.verify_tier(credential_id, 3)
        }

        fn is_fish_or_above(self: @ContractState, credential_id: felt252) -> bool {
            let registry = self._get_registry();
            registry.verify_tier(credential_id, 2)
        }

        fn is_crab_or_above(self: @ContractState, credential_id: felt252) -> bool {
            let registry = self._get_registry();
            registry.verify_tier(credential_id, 1)
        }

        fn is_holder(self: @ContractState, credential_id: felt252) -> bool {
            let registry = self._get_registry();
            registry.verify_tier(credential_id, 0)
        }

        fn get_tier(self: @ContractState, credential_id: felt252) -> u8 {
            let registry = self._get_registry();
            let credential = registry.get_credential(credential_id);

            if credential.pubkey_hash == 0 || credential.revoked {
                return 0;
            }

            credential.tier
        }

        fn batch_verify(
            self: @ContractState, credential_ids: Array<felt252>, min_tier: u8,
        ) -> Array<bool> {
            let len = credential_ids.len();
            assert(len <= MAX_BATCH_SIZE, 'Batch size exceeds 100');

            let registry = self._get_registry();
            let mut results: Array<bool> = ArrayTrait::new();

            let mut i: u32 = 0;

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

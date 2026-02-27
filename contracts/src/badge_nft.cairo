/// BadgeNFT - Lean ERC-721 for credential tier badges
/// Permissionless minting gated by credential registry verification

#[starknet::contract]
pub mod BadgeNFT {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess,
        StorageMapWriteAccess, Map,
    };
    use core::num::traits::Zero;
    use crate::interfaces::{
        IBadgeNFT, BadgeData, ICredentialRegistryDispatcher, ICredentialRegistryDispatcherTrait,
    };

    #[storage]
    struct Storage {
        // ERC-721 core
        token_owner: Map<u256, ContractAddress>,
        owner_balance: Map<ContractAddress, u256>,
        // Badge data
        token_badge: Map<u256, BadgeData>,
        // Credential → token mapping (prevents double-mint)
        credential_token: Map<felt252, u256>,
        // Counters
        next_token_id: u256,
        total_supply: u256,
        // Config
        registry_address: ContractAddress,
        base_uri: ByteArray,
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        Transfer: Transfer,
        BadgeMinted: BadgeMinted,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Transfer {
        #[key]
        pub from: ContractAddress,
        #[key]
        pub to: ContractAddress,
        #[key]
        pub token_id: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BadgeMinted {
        #[key]
        pub token_id: u256,
        #[key]
        pub credential_id: felt252,
        pub credential_type: felt252,
        pub tier: u8,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        registry_address: ContractAddress,
        base_uri: ByteArray,
    ) {
        assert(!owner.is_zero(), 'Owner cannot be zero');
        assert(!registry_address.is_zero(), 'Registry cannot be zero');
        self.owner.write(owner);
        self.registry_address.write(registry_address);
        self.base_uri.write(base_uri);
        // Token IDs start at 1 (0 is used as "no token" sentinel)
        self.next_token_id.write(1);
    }

    #[abi(embed_v0)]
    impl BadgeNFTImpl of IBadgeNFT<ContractState> {
        fn mint(
            ref self: ContractState, recipient: ContractAddress, credential_id: felt252,
        ) -> u256 {
            assert(!recipient.is_zero(), 'Recipient cannot be zero');
            assert(credential_id != 0, 'Invalid credential ID');

            // Check double-mint
            let existing = self.credential_token.read(credential_id);
            assert(existing == 0, 'Badge already minted');

            // Cross-contract call to verify credential exists and is not revoked
            let registry = ICredentialRegistryDispatcher {
                contract_address: self.registry_address.read(),
            };
            let credential = registry.get_credential(credential_id);
            assert(credential.pubkey_hash != 0, 'Credential does not exist');
            assert(!credential.revoked, 'Credential is revoked');

            // [H-1 FIX] Check credential expiry
            if credential.expires_at != 0 {
                assert(get_block_timestamp() <= credential.expires_at, 'Credential has expired');
            }

            // Assign token
            let token_id = self.next_token_id.read();
            self.next_token_id.write(token_id + 1);
            self.total_supply.write(self.total_supply.read() + 1);

            // Store ownership
            self.token_owner.write(token_id, recipient);
            self.owner_balance.write(recipient, self.owner_balance.read(recipient) + 1);

            // Store badge data
            let badge = BadgeData {
                credential_type: credential.credential_type,
                tier: credential.tier,
                credential_id,
            };
            self.token_badge.write(token_id, badge);
            self.credential_token.write(credential_id, token_id);

            // Emit events
            self
                .emit(
                    Transfer { from: Zero::zero(), to: recipient, token_id },
                );
            self
                .emit(
                    BadgeMinted {
                        token_id,
                        credential_id,
                        credential_type: credential.credential_type,
                        tier: credential.tier,
                    },
                );

            token_id
        }

        fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            let owner = self.token_owner.read(token_id);
            assert(!owner.is_zero(), 'Token does not exist');
            owner
        }

        fn balance_of(self: @ContractState, owner: ContractAddress) -> u256 {
            assert(!owner.is_zero(), 'Invalid owner address');
            self.owner_balance.read(owner)
        }

        fn get_badge_data(self: @ContractState, token_id: u256) -> (felt252, u8) {
            let badge = self.token_badge.read(token_id);
            assert(badge.credential_id != 0, 'Token does not exist');
            (badge.credential_type, badge.tier)
        }

        fn has_badge(self: @ContractState, credential_id: felt252) -> bool {
            self.credential_token.read(credential_id) != 0
        }

        fn get_total_supply(self: @ContractState) -> u256 {
            self.total_supply.read()
        }

        fn get_base_uri(self: @ContractState) -> ByteArray {
            self.base_uri.read()
        }

        fn set_base_uri(ref self: ContractState, new_base_uri: ByteArray) {
            assert(get_caller_address() == self.owner.read(), 'Caller is not owner');
            self.base_uri.write(new_base_uri);
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }

        fn transfer_ownership(ref self: ContractState, new_owner: ContractAddress) {
            assert(get_caller_address() == self.owner.read(), 'Caller is not owner');
            assert(!new_owner.is_zero(), 'New owner cannot be zero');
            self.owner.write(new_owner);
        }
    }
}

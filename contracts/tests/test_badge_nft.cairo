use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::ContractAddress;
use core::poseidon::poseidon_hash_span;
use core::serde::Serde;
use zkcred::interfaces::{
    IBadgeNFTDispatcher, IBadgeNFTDispatcherTrait, ICredentialRegistryDispatcher,
    ICredentialRegistryDispatcherTrait,
};

fn OWNER() -> ContractAddress {
    starknet::contract_address_const::<0x123>()
}

fn USER() -> ContractAddress {
    starknet::contract_address_const::<0x456>()
}

fn RECIPIENT() -> ContractAddress {
    starknet::contract_address_const::<0x789>()
}

/// Deploy CredentialRegistry + BadgeNFT together
fn deploy_contracts() -> (
    ContractAddress,
    ICredentialRegistryDispatcher,
    ContractAddress,
    IBadgeNFTDispatcher,
) {
    // Deploy registry first
    let registry_class = declare("CredentialRegistry").unwrap().contract_class();
    let registry_args = array![OWNER().into()];
    let (registry_address, _) = registry_class.deploy(@registry_args).unwrap();
    let registry = ICredentialRegistryDispatcher { contract_address: registry_address };

    // Deploy BadgeNFT pointing at the registry
    let badge_class = declare("BadgeNFT").unwrap().contract_class();
    let mut badge_args: Array<felt252> = array![OWNER().into(), registry_address.into()];
    let base_uri: ByteArray = "https://zkcred.xyz";
    base_uri.serialize(ref badge_args);
    let (badge_address, _) = badge_class.deploy(@badge_args).unwrap();
    let badge_nft = IBadgeNFTDispatcher { contract_address: badge_address };

    (registry_address, registry, badge_address, badge_nft)
}

/// Helper: compute commitment matching the contract's logic
fn compute_commitment(
    pubkey_hash: felt252,
    credential_type: felt252,
    tier: u8,
    verification_hash: felt252,
    salt: felt252,
) -> felt252 {
    poseidon_hash_span(
        array![pubkey_hash, credential_type, tier.into(), verification_hash, salt].span(),
    )
}

/// Helper: issue a credential as owner and return credential_id
fn issue_credential(
    registry_address: ContractAddress,
    registry: ICredentialRegistryDispatcher,
    pubkey_hash: felt252,
    credential_type: felt252,
    tier: u8,
) -> felt252 {
    let salt: felt252 = 0xdeadbeef;
    let verification_hash: felt252 = 0xcafe;
    let oracle_provider: felt252 = 'test_oracle';
    let commitment = compute_commitment(pubkey_hash, credential_type, tier, verification_hash, salt);

    start_cheat_caller_address(registry_address, OWNER());
    let cred_id = registry
        .issue_credential(
            pubkey_hash, credential_type, tier, salt, verification_hash, oracle_provider, commitment,
        );
    stop_cheat_caller_address(registry_address);
    cred_id
}

// ============ Tests ============

#[test]
fn test_initial_state() {
    let (_, _, _, badge_nft) = deploy_contracts();

    assert(badge_nft.get_total_supply() == 0, 'Should start with 0 supply');
    assert(badge_nft.get_owner() == OWNER(), 'Wrong owner');
    assert(badge_nft.get_base_uri() == "https://zkcred.xyz", 'Wrong base URI');
}

#[test]
fn test_mint_success() {
    let (registry_address, registry, _, badge_nft) = deploy_contracts();

    let cred_id = issue_credential(registry_address, registry, 0xabc, 'btc_tier', 3);

    let token_id = badge_nft.mint(RECIPIENT(), cred_id);

    assert(token_id == 1, 'First token should be 1');
    assert(badge_nft.owner_of(token_id) == RECIPIENT(), 'Wrong token owner');
    assert(badge_nft.balance_of(RECIPIENT()) == 1, 'Balance should be 1');
    assert(badge_nft.has_badge(cred_id), 'Should have badge');
    assert(badge_nft.get_total_supply() == 1, 'Supply should be 1');

    let (cred_type, tier) = badge_nft.get_badge_data(token_id);
    assert(cred_type == 'btc_tier', 'Wrong credential type');
    assert(tier == 3, 'Wrong tier');
}

#[test]
fn test_mint_multiple() {
    let (registry_address, registry, _, badge_nft) = deploy_contracts();

    let cred1 = issue_credential(registry_address, registry, 0xabc, 'btc_tier', 3);
    let cred2 = issue_credential(registry_address, registry, 0xdef, 'github_dev', 1);

    let token1 = badge_nft.mint(RECIPIENT(), cred1);
    let token2 = badge_nft.mint(USER(), cred2);

    assert(token1 == 1, 'First token should be 1');
    assert(token2 == 2, 'Second token should be 2');
    assert(badge_nft.get_total_supply() == 2, 'Supply should be 2');
    assert(badge_nft.balance_of(RECIPIENT()) == 1, 'Recipient balance wrong');
    assert(badge_nft.balance_of(USER()) == 1, 'User balance wrong');
}

#[test]
#[should_panic(expected: 'Badge already minted')]
fn test_double_mint_rejected() {
    let (registry_address, registry, _, badge_nft) = deploy_contracts();

    let cred_id = issue_credential(registry_address, registry, 0xabc, 'btc_tier', 2);

    badge_nft.mint(RECIPIENT(), cred_id);
    // Second mint of same credential should fail
    badge_nft.mint(USER(), cred_id);
}

#[test]
#[should_panic(expected: 'Credential is revoked')]
fn test_revoked_credential_rejected() {
    let (registry_address, registry, _, badge_nft) = deploy_contracts();

    let cred_id = issue_credential(registry_address, registry, 0xabc, 'btc_tier', 1);

    // Revoke the credential
    start_cheat_caller_address(registry_address, OWNER());
    registry.revoke_credential(cred_id);
    stop_cheat_caller_address(registry_address);

    // Mint should fail
    badge_nft.mint(RECIPIENT(), cred_id);
}

#[test]
#[should_panic(expected: 'Credential does not exist')]
fn test_nonexistent_credential_rejected() {
    let (_, _, _, badge_nft) = deploy_contracts();

    // Try minting with a credential ID that was never issued
    badge_nft.mint(RECIPIENT(), 0x999);
}

#[test]
#[should_panic(expected: 'Recipient cannot be zero')]
fn test_mint_to_zero_address() {
    let (registry_address, registry, _, badge_nft) = deploy_contracts();
    let cred_id = issue_credential(registry_address, registry, 0xabc, 'btc_tier', 0);
    badge_nft.mint(starknet::contract_address_const::<0>(), cred_id);
}

#[test]
#[should_panic(expected: 'Invalid credential ID')]
fn test_mint_zero_credential() {
    let (_, _, _, badge_nft) = deploy_contracts();
    badge_nft.mint(RECIPIENT(), 0);
}

#[test]
fn test_has_badge_false_by_default() {
    let (_, _, _, badge_nft) = deploy_contracts();
    assert(!badge_nft.has_badge(0x999), 'Should not have badge');
}

#[test]
#[should_panic(expected: 'Token does not exist')]
fn test_owner_of_nonexistent() {
    let (_, _, _, badge_nft) = deploy_contracts();
    badge_nft.owner_of(42);
}

#[test]
#[should_panic(expected: 'Token does not exist')]
fn test_badge_data_nonexistent() {
    let (_, _, _, badge_nft) = deploy_contracts();
    badge_nft.get_badge_data(42);
}

#[test]
fn test_set_base_uri() {
    let (_, _, badge_address, badge_nft) = deploy_contracts();

    start_cheat_caller_address(badge_address, OWNER());
    badge_nft.set_base_uri("https://new-domain.xyz");
    stop_cheat_caller_address(badge_address);

    assert(badge_nft.get_base_uri() == "https://new-domain.xyz", 'URI not updated');
}

#[test]
#[should_panic(expected: 'Caller is not owner')]
fn test_set_base_uri_not_owner() {
    let (_, _, badge_address, badge_nft) = deploy_contracts();

    start_cheat_caller_address(badge_address, USER());
    badge_nft.set_base_uri("https://hacker.xyz");
    stop_cheat_caller_address(badge_address);
}

// [M-1 FIX] Transfer ownership tests
#[test]
fn test_transfer_ownership() {
    let (_, _, badge_address, badge_nft) = deploy_contracts();

    start_cheat_caller_address(badge_address, OWNER());
    badge_nft.transfer_ownership(USER());
    stop_cheat_caller_address(badge_address);

    assert(badge_nft.get_owner() == USER(), 'Owner not transferred');

    // New owner can set base URI
    start_cheat_caller_address(badge_address, USER());
    badge_nft.set_base_uri("https://new.xyz");
    stop_cheat_caller_address(badge_address);

    assert(badge_nft.get_base_uri() == "https://new.xyz", 'New owner should work');
}

#[test]
#[should_panic(expected: 'Caller is not owner')]
fn test_transfer_ownership_not_owner() {
    let (_, _, badge_address, badge_nft) = deploy_contracts();

    start_cheat_caller_address(badge_address, USER());
    badge_nft.transfer_ownership(USER());
    stop_cheat_caller_address(badge_address);
}

#[test]
#[should_panic(expected: 'New owner cannot be zero')]
fn test_transfer_ownership_to_zero() {
    let (_, _, badge_address, badge_nft) = deploy_contracts();

    start_cheat_caller_address(badge_address, OWNER());
    badge_nft.transfer_ownership(starknet::contract_address_const::<0>());
    stop_cheat_caller_address(badge_address);
}

use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::ContractAddress;
use zkcred::interfaces::{ICredentialRegistryDispatcher, ICredentialRegistryDispatcherTrait};

fn OWNER() -> ContractAddress {
    starknet::contract_address_const::<0x123>()
}

fn USER() -> ContractAddress {
    starknet::contract_address_const::<0x456>()
}

fn deploy_registry() -> (ContractAddress, ICredentialRegistryDispatcher) {
    let contract = declare("CredentialRegistry").unwrap().contract_class();
    let constructor_args = array![OWNER().into()];
    let (contract_address, _) = contract.deploy(@constructor_args).unwrap();

    let dispatcher = ICredentialRegistryDispatcher { contract_address };
    (contract_address, dispatcher)
}

#[test]
fn test_issue_credential() {
    let (_, registry) = deploy_registry();

    let pubkey_hash: felt252 = 0x123456789;
    let credential_type: felt252 = 'btc_tier';
    let tier: u8 = 3; // Whale
    let salt: felt252 = 0xabc;

    let credential_id = registry.issue_credential(pubkey_hash, credential_type, tier, salt);

    // Verify credential was created
    let credential = registry.get_credential(credential_id);
    assert(credential.pubkey_hash == pubkey_hash, 'Wrong pubkey hash');
    assert(credential.credential_type == credential_type, 'Wrong type');
    assert(credential.tier == 3, 'Wrong tier');
    assert(!credential.revoked, 'Should not be revoked');
}

#[test]
fn test_verify_tier() {
    let (_, registry) = deploy_registry();

    let credential_id = registry
        .issue_credential(
            0x123, 'btc_tier', 2, 0xabc, // Fish tier
        );

    // Should pass for tier 0, 1, 2
    assert(registry.verify_tier(credential_id, 0), 'Should pass tier 0');
    assert(registry.verify_tier(credential_id, 1), 'Should pass tier 1');
    assert(registry.verify_tier(credential_id, 2), 'Should pass tier 2');

    // Should fail for tier 3
    assert(!registry.verify_tier(credential_id, 3), 'Should fail tier 3');
}

#[test]
fn test_is_issued() {
    let (_, registry) = deploy_registry();

    let pubkey_hash: felt252 = 0x123;
    let credential_type: felt252 = 'btc_tier';

    // Should not be issued initially
    assert(!registry.is_issued(pubkey_hash, credential_type), 'Should not be issued');

    // Issue credential
    registry.issue_credential(pubkey_hash, credential_type, 2, 0xabc);

    // Should be issued now
    assert(registry.is_issued(pubkey_hash, credential_type), 'Should be issued');
}

#[test]
#[should_panic(expected: 'Credential already issued')]
fn test_double_issuance_fails() {
    let (_, registry) = deploy_registry();

    let pubkey_hash: felt252 = 0x123;
    let credential_type: felt252 = 'btc_tier';

    // First issuance should succeed
    registry.issue_credential(pubkey_hash, credential_type, 2, 0xabc);

    // Second issuance should fail
    registry.issue_credential(pubkey_hash, credential_type, 3, 0xdef);
}

#[test]
fn test_different_credential_types() {
    let (_, registry) = deploy_registry();

    let pubkey_hash: felt252 = 0x123;

    // Can issue both types for same pubkey
    let cred1 = registry.issue_credential(pubkey_hash, 'btc_tier', 2, 0xabc);
    let cred2 = registry.issue_credential(pubkey_hash, 'wallet_age', 1, 0xdef);

    assert(cred1 != cred2, 'Should have different IDs');

    let c1 = registry.get_credential(cred1);
    let c2 = registry.get_credential(cred2);

    assert(c1.credential_type == 'btc_tier', 'Wrong type 1');
    assert(c2.credential_type == 'wallet_age', 'Wrong type 2');
}

#[test]
fn test_revoke_credential() {
    let (contract_address, registry) = deploy_registry();

    let credential_id = registry.issue_credential(0x123, 'btc_tier', 3, 0xabc);

    // Verify active
    assert(registry.verify_tier(credential_id, 3), 'Should be valid');

    // Revoke (must be called by owner)
    start_cheat_caller_address(contract_address, OWNER());
    registry.revoke_credential(credential_id);
    stop_cheat_caller_address(contract_address);

    // Verify revoked (verify_tier should fail)
    assert(!registry.verify_tier(credential_id, 0), 'Should be revoked');

    // Check credential state
    let credential = registry.get_credential(credential_id);
    assert(credential.revoked, 'Should be marked revoked');
}

#[test]
#[should_panic(expected: 'Credential not found')]
fn test_revoke_nonexistent_fails() {
    let (contract_address, registry) = deploy_registry();

    // Try to revoke a credential that doesn't exist (must be owner)
    start_cheat_caller_address(contract_address, OWNER());
    registry.revoke_credential(0x999);
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: 'Already revoked')]
fn test_double_revoke_fails() {
    let (contract_address, registry) = deploy_registry();

    let credential_id = registry.issue_credential(0x123, 'btc_tier', 3, 0xabc);

    // Must be owner to revoke
    start_cheat_caller_address(contract_address, OWNER());

    // First revoke succeeds
    registry.revoke_credential(credential_id);

    // Second revoke fails
    registry.revoke_credential(credential_id);
}

#[test]
#[should_panic(expected: 'Invalid tier (must be 0-3)')]
fn test_invalid_tier_fails() {
    let (_, registry) = deploy_registry();

    // Tier 4 is invalid
    registry.issue_credential(0x123, 'btc_tier', 4, 0xabc);
}

#[test]
#[should_panic(expected: 'Invalid credential type')]
fn test_invalid_type_fails() {
    let (_, registry) = deploy_registry();

    // 'invalid' is not a valid type
    registry.issue_credential(0x123, 'invalid', 2, 0xabc);
}

#[test]
fn test_total_issued_counter() {
    let (_, registry) = deploy_registry();

    assert(registry.get_total_issued() == 0, 'Should start at 0');

    registry.issue_credential(0x111, 'btc_tier', 1, 0xaaa);
    assert(registry.get_total_issued() == 1, 'Should be 1');

    registry.issue_credential(0x222, 'btc_tier', 2, 0xbbb);
    assert(registry.get_total_issued() == 2, 'Should be 2');

    registry.issue_credential(0x333, 'btc_tier', 3, 0xccc);
    assert(registry.get_total_issued() == 3, 'Should be 3');
}

#[test]
fn test_get_owner() {
    let (_, registry) = deploy_registry();

    assert(registry.get_owner() == OWNER(), 'Wrong owner');
}

#[test]
fn test_not_paused_by_default() {
    let (_, registry) = deploy_registry();

    assert(!registry.is_paused(), 'Should not be paused');
}

#[test]
fn test_nonexistent_credential_returns_zero() {
    let (_, registry) = deploy_registry();

    let credential = registry.get_credential(0x999);

    // Nonexistent credential should have pubkey_hash = 0
    assert(credential.pubkey_hash == 0, 'Should be zero');
}

#[test]
fn test_verify_tier_nonexistent_fails() {
    let (_, registry) = deploy_registry();

    // Nonexistent credential should fail verification
    assert(!registry.verify_tier(0x999, 0), 'Should fail');
}

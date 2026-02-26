use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::ContractAddress;
use zkcred::interfaces::{ICredentialRegistryDispatcher, ICredentialRegistryDispatcherTrait};
use core::poseidon::poseidon_hash_span;

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

/// Helper: issue a credential as owner
fn issue_as_owner(
    contract_address: ContractAddress,
    registry: ICredentialRegistryDispatcher,
    pubkey_hash: felt252,
    credential_type: felt252,
    tier: u8,
    salt: felt252,
    verification_hash: felt252,
    oracle_provider: felt252,
    commitment: felt252,
) -> felt252 {
    start_cheat_caller_address(contract_address, OWNER());
    let id = registry.issue_credential(
        pubkey_hash, credential_type, tier, salt, verification_hash, oracle_provider, commitment,
    );
    stop_cheat_caller_address(contract_address);
    id
}

// ============ Basic Issuance Tests ============

#[test]
fn test_issue_credential() {
    let (contract_address, registry) = deploy_registry();

    let pubkey_hash: felt252 = 0x123456789;
    let credential_type: felt252 = 'btc_tier';
    let tier: u8 = 3;
    let salt: felt252 = 0xabc;
    let verification_hash: felt252 = 0xdef;
    let oracle_provider: felt252 = 'mempool';
    let commitment = compute_commitment(pubkey_hash, credential_type, tier, verification_hash, salt);

    let credential_id = issue_as_owner(
        contract_address, registry, pubkey_hash, credential_type, tier, salt,
        verification_hash, oracle_provider, commitment,
    );

    let credential = registry.get_credential(credential_id);
    assert(credential.pubkey_hash == pubkey_hash, 'Wrong pubkey hash');
    assert(credential.credential_type == credential_type, 'Wrong type');
    assert(credential.tier == 3, 'Wrong tier');
    assert(!credential.revoked, 'Should not be revoked');
    assert(credential.commitment == commitment, 'Wrong commitment');
}

// [C-1] Non-owner cannot issue credentials
#[test]
#[should_panic(expected: 'Caller is not owner')]
fn test_non_owner_cannot_issue() {
    let (contract_address, registry) = deploy_registry();

    let attacker = starknet::contract_address_const::<0x999>();
    start_cheat_caller_address(contract_address, attacker);
    let c = compute_commitment(0x123, 'btc_tier', 3, 0, 0xabc);
    registry.issue_credential(0x123, 'btc_tier', 3, 0xabc, 0, 0, c);
    stop_cheat_caller_address(contract_address);
}

// [M-1] Zero pubkey_hash is rejected
#[test]
#[should_panic(expected: 'Zero pubkey_hash not allowed')]
fn test_zero_pubkey_rejected() {
    let (contract_address, registry) = deploy_registry();

    start_cheat_caller_address(contract_address, OWNER());
    registry.issue_credential(0, 'btc_tier', 1, 0xabc, 0, 'mempool', 0);
    stop_cheat_caller_address(contract_address);
}

// [H-1] Mismatched commitment is rejected
#[test]
#[should_panic(expected: 'Commitment mismatch')]
fn test_commitment_mismatch_rejected() {
    let (contract_address, registry) = deploy_registry();

    start_cheat_caller_address(contract_address, OWNER());
    // Pass a wrong commitment — contract should reject
    registry.issue_credential(0x123, 'btc_tier', 3, 0xabc, 0, 0, 0xBADC0FFEE);
    stop_cheat_caller_address(contract_address);
}

// [H-1] Zero commitment uses auto-computed value
#[test]
fn test_zero_commitment_auto_computed() {
    let (contract_address, registry) = deploy_registry();

    start_cheat_caller_address(contract_address, OWNER());
    let credential_id = registry.issue_credential(0x123, 'btc_tier', 2, 0xabc, 0xdef, 'mempool', 0);
    stop_cheat_caller_address(contract_address);

    let expected = compute_commitment(0x123, 'btc_tier', 2, 0xdef, 0xabc);
    let cred = registry.get_credential(credential_id);
    assert(cred.commitment == expected, 'Auto commitment wrong');
}

#[test]
fn test_verify_tier() {
    let (contract_address, registry) = deploy_registry();

    let commitment = compute_commitment(0x123, 'btc_tier', 2, 0, 0xabc);
    let credential_id = issue_as_owner(
        contract_address, registry, 0x123, 'btc_tier', 2, 0xabc, 0, 0, commitment,
    );

    assert(registry.verify_tier(credential_id, 0), 'Should pass tier 0');
    assert(registry.verify_tier(credential_id, 1), 'Should pass tier 1');
    assert(registry.verify_tier(credential_id, 2), 'Should pass tier 2');
    assert(!registry.verify_tier(credential_id, 3), 'Should fail tier 3');
}

#[test]
fn test_is_issued() {
    let (contract_address, registry) = deploy_registry();

    let pubkey_hash: felt252 = 0x123;
    let credential_type: felt252 = 'btc_tier';

    assert(!registry.is_issued(pubkey_hash, credential_type), 'Should not be issued');

    let commitment = compute_commitment(pubkey_hash, credential_type, 2, 0, 0xabc);
    issue_as_owner(
        contract_address, registry, pubkey_hash, credential_type, 2, 0xabc, 0, 0, commitment,
    );

    assert(registry.is_issued(pubkey_hash, credential_type), 'Should be issued');
}

#[test]
#[should_panic(expected: 'Credential already issued')]
fn test_double_issuance_fails() {
    let (contract_address, registry) = deploy_registry();

    let pubkey_hash: felt252 = 0x123;
    let credential_type: felt252 = 'btc_tier';

    let c1 = compute_commitment(pubkey_hash, credential_type, 2, 0, 0xabc);
    issue_as_owner(
        contract_address, registry, pubkey_hash, credential_type, 2, 0xabc, 0, 0, c1,
    );

    let c2 = compute_commitment(pubkey_hash, credential_type, 3, 0, 0xdef);
    // This should fail
    start_cheat_caller_address(contract_address, OWNER());
    registry.issue_credential(pubkey_hash, credential_type, 3, 0xdef, 0, 0, c2);
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_different_credential_types() {
    let (contract_address, registry) = deploy_registry();

    let pubkey_hash: felt252 = 0x123;

    let c1 = compute_commitment(pubkey_hash, 'btc_tier', 2, 0, 0xabc);
    let c2 = compute_commitment(pubkey_hash, 'wallet_age', 1, 0, 0xdef);

    let cred1 = issue_as_owner(
        contract_address, registry, pubkey_hash, 'btc_tier', 2, 0xabc, 0, 0, c1,
    );
    let cred2 = issue_as_owner(
        contract_address, registry, pubkey_hash, 'wallet_age', 1, 0xdef, 0, 0, c2,
    );

    assert(cred1 != cred2, 'Should have different IDs');

    let credential1 = registry.get_credential(cred1);
    let credential2 = registry.get_credential(cred2);

    assert(credential1.credential_type == 'btc_tier', 'Wrong type 1');
    assert(credential2.credential_type == 'wallet_age', 'Wrong type 2');
}

// ============ New Credential Types ============

#[test]
fn test_github_credential() {
    let (contract_address, registry) = deploy_registry();

    let c = compute_commitment(0x111, 'github_dev', 2, 0xfed, 0xabc);
    let id = issue_as_owner(
        contract_address, registry, 0x111, 'github_dev', 2, 0xabc, 0xfed, 'github', c,
    );

    let cred = registry.get_credential(id);
    assert(cred.credential_type == 'github_dev', 'Wrong type');
    assert(cred.tier == 2, 'Wrong tier');
    assert(cred.oracle_provider == 'github', 'Wrong provider');
}

#[test]
fn test_steam_credential() {
    let (contract_address, registry) = deploy_registry();

    let c = compute_commitment(0x222, 'steam_gamer', 3, 0xfed, 0xabc);
    let id = issue_as_owner(
        contract_address, registry, 0x222, 'steam_gamer', 3, 0xabc, 0xfed, 'steam', c,
    );

    let cred = registry.get_credential(id);
    assert(cred.credential_type == 'steam_gamer', 'Wrong type');
    assert(cred.tier == 3, 'Wrong tier');
}

#[test]
fn test_leetcode_credential() {
    let (contract_address, registry) = deploy_registry();

    let c = compute_commitment(0x333, 'leetcode_coder', 1, 0xfed, 0xabc);
    let id = issue_as_owner(
        contract_address, registry, 0x333, 'leetcode_coder', 1, 0xabc, 0xfed, 'leetcode', c,
    );

    let cred = registry.get_credential(id);
    assert(cred.credential_type == 'leetcode_coder', 'Wrong type');
    assert(cred.tier == 1, 'Wrong tier');
}

#[test]
fn test_eth_holder_credential() {
    let (contract_address, registry) = deploy_registry();

    let c = compute_commitment(0x444, 'eth_holder', 2, 0xfed, 0xabc);
    let id = issue_as_owner(
        contract_address, registry, 0x444, 'eth_holder', 2, 0xabc, 0xfed, 'etherscan', c,
    );

    let cred = registry.get_credential(id);
    assert(cred.credential_type == 'eth_holder', 'Wrong type');
    assert(cred.tier == 2, 'Wrong tier');
}

#[test]
fn test_strava_credential() {
    let (contract_address, registry) = deploy_registry();

    let c = compute_commitment(0x555, 'strava_athlete', 3, 0xfed, 0xabc);
    let id = issue_as_owner(
        contract_address, registry, 0x555, 'strava_athlete', 3, 0xabc, 0xfed, 'strava', c,
    );

    let cred = registry.get_credential(id);
    assert(cred.credential_type == 'strava_athlete', 'Wrong type');
    assert(cred.tier == 3, 'Wrong tier');
}

#[test]
fn test_all_types_for_same_user() {
    let (contract_address, registry) = deploy_registry();

    let pubkey: felt252 = 0x999;

    let c1 = compute_commitment(pubkey, 'btc_tier', 1, 0, 0x1);
    let c2 = compute_commitment(pubkey, 'wallet_age', 2, 0, 0x2);
    let c3 = compute_commitment(pubkey, 'github_dev', 3, 0, 0x3);
    let c4 = compute_commitment(pubkey, 'steam_gamer', 0, 0, 0x4);
    let c5 = compute_commitment(pubkey, 'leetcode_coder', 1, 0, 0x5);
    let c6 = compute_commitment(pubkey, 'eth_holder', 2, 0, 0x6);
    let c7 = compute_commitment(pubkey, 'strava_athlete', 3, 0, 0x7);

    start_cheat_caller_address(contract_address, OWNER());
    registry.issue_credential(pubkey, 'btc_tier', 1, 0x1, 0, 0, c1);
    registry.issue_credential(pubkey, 'wallet_age', 2, 0x2, 0, 0, c2);
    registry.issue_credential(pubkey, 'github_dev', 3, 0x3, 0, 0, c3);
    registry.issue_credential(pubkey, 'steam_gamer', 0, 0x4, 0, 0, c4);
    registry.issue_credential(pubkey, 'leetcode_coder', 1, 0x5, 0, 0, c5);
    registry.issue_credential(pubkey, 'eth_holder', 2, 0x6, 0, 0, c6);
    registry.issue_credential(pubkey, 'strava_athlete', 3, 0x7, 0, 0, c7);
    stop_cheat_caller_address(contract_address);

    assert(registry.get_total_issued() == 7, 'Should have 7 credentials');
}

// ============ Commitment Verification Tests ============

#[test]
fn test_verify_commitment_valid() {
    let (contract_address, registry) = deploy_registry();

    let pubkey_hash: felt252 = 0x123;
    let credential_type: felt252 = 'btc_tier';
    let tier: u8 = 2;
    let verification_hash: felt252 = 0xdeadbeef;
    let salt: felt252 = 0xabc;

    let commitment = compute_commitment(pubkey_hash, credential_type, tier, verification_hash, salt);
    let credential_id = issue_as_owner(
        contract_address, registry, pubkey_hash, credential_type, tier, salt,
        verification_hash, 'mempool', commitment,
    );

    let result = registry.verify_commitment(
        credential_id, pubkey_hash, credential_type, tier, verification_hash, salt,
    );
    assert(result, 'Commitment should verify');
}

#[test]
fn test_verify_commitment_tampered_tier() {
    let (contract_address, registry) = deploy_registry();

    let pubkey_hash: felt252 = 0x123;
    let credential_type: felt252 = 'btc_tier';
    let tier: u8 = 2;
    let verification_hash: felt252 = 0xdeadbeef;
    let salt: felt252 = 0xabc;

    let commitment = compute_commitment(pubkey_hash, credential_type, tier, verification_hash, salt);
    let credential_id = issue_as_owner(
        contract_address, registry, pubkey_hash, credential_type, tier, salt,
        verification_hash, 'mempool', commitment,
    );

    let result = registry.verify_commitment(
        credential_id, pubkey_hash, credential_type, 3, verification_hash, salt,
    );
    assert(!result, 'Should detect tampered tier');
}

#[test]
fn test_verify_commitment_wrong_salt() {
    let (contract_address, registry) = deploy_registry();

    let pubkey_hash: felt252 = 0x123;
    let credential_type: felt252 = 'btc_tier';
    let tier: u8 = 2;
    let verification_hash: felt252 = 0xdeadbeef;
    let salt: felt252 = 0xabc;

    let commitment = compute_commitment(pubkey_hash, credential_type, tier, verification_hash, salt);
    let credential_id = issue_as_owner(
        contract_address, registry, pubkey_hash, credential_type, tier, salt,
        verification_hash, 'mempool', commitment,
    );

    let result = registry.verify_commitment(
        credential_id, pubkey_hash, credential_type, tier, verification_hash, 0x999,
    );
    assert(!result, 'Should detect wrong salt');
}

#[test]
fn test_verify_commitment_nonexistent() {
    let (_, registry) = deploy_registry();

    let result = registry.verify_commitment(0x999, 0x123, 'btc_tier', 2, 0xdef, 0xabc);
    assert(!result, 'Should fail for nonexistent');
}

// ============ Revocation Tests ============

#[test]
fn test_revoke_credential() {
    let (contract_address, registry) = deploy_registry();

    let c = compute_commitment(0x123, 'btc_tier', 3, 0, 0xabc);
    let credential_id = issue_as_owner(
        contract_address, registry, 0x123, 'btc_tier', 3, 0xabc, 0, 0, c,
    );

    assert(registry.verify_tier(credential_id, 3), 'Should be valid');

    start_cheat_caller_address(contract_address, OWNER());
    registry.revoke_credential(credential_id);
    stop_cheat_caller_address(contract_address);

    assert(!registry.verify_tier(credential_id, 0), 'Should be revoked');

    let credential = registry.get_credential(credential_id);
    assert(credential.revoked, 'Should be marked revoked');
}

// [H-2] Re-issuance after revocation should work
#[test]
fn test_reissue_after_revocation() {
    let (contract_address, registry) = deploy_registry();

    let c1 = compute_commitment(0x123, 'btc_tier', 2, 0, 0xabc);
    let cred_id = issue_as_owner(
        contract_address, registry, 0x123, 'btc_tier', 2, 0xabc, 0, 0, c1,
    );

    // Revoke
    start_cheat_caller_address(contract_address, OWNER());
    registry.revoke_credential(cred_id);
    stop_cheat_caller_address(contract_address);

    assert(!registry.is_issued(0x123, 'btc_tier'), 'Should be cleared');

    // Re-issue with upgraded tier
    let c2 = compute_commitment(0x123, 'btc_tier', 3, 0, 0xdef);
    let new_id = issue_as_owner(
        contract_address, registry, 0x123, 'btc_tier', 3, 0xdef, 0, 0, c2,
    );

    assert(new_id != cred_id, 'Should be new ID');
    assert(registry.verify_tier(new_id, 3), 'Should be tier 3 now');
}

#[test]
#[should_panic(expected: 'Credential not found')]
fn test_revoke_nonexistent_fails() {
    let (contract_address, registry) = deploy_registry();

    start_cheat_caller_address(contract_address, OWNER());
    registry.revoke_credential(0x999);
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: 'Already revoked')]
fn test_double_revoke_fails() {
    let (contract_address, registry) = deploy_registry();

    let c = compute_commitment(0x123, 'btc_tier', 3, 0, 0xabc);
    let credential_id = issue_as_owner(
        contract_address, registry, 0x123, 'btc_tier', 3, 0xabc, 0, 0, c,
    );

    start_cheat_caller_address(contract_address, OWNER());
    registry.revoke_credential(credential_id);
    registry.revoke_credential(credential_id);
}

// ============ Edge Case Tests ============

#[test]
#[should_panic(expected: 'Invalid tier (must be 0-3)')]
fn test_invalid_tier_fails() {
    let (contract_address, registry) = deploy_registry();

    start_cheat_caller_address(contract_address, OWNER());
    let c = compute_commitment(0x123, 'btc_tier', 4, 0, 0xabc);
    registry.issue_credential(0x123, 'btc_tier', 4, 0xabc, 0, 0, c);
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: 'Invalid credential type')]
fn test_invalid_type_fails() {
    let (contract_address, registry) = deploy_registry();

    start_cheat_caller_address(contract_address, OWNER());
    let c = compute_commitment(0x123, 'invalid', 2, 0, 0xabc);
    registry.issue_credential(0x123, 'invalid', 2, 0xabc, 0, 0, c);
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_total_issued_counter() {
    let (contract_address, registry) = deploy_registry();

    assert(registry.get_total_issued() == 0, 'Should start at 0');

    let c1 = compute_commitment(0x111, 'btc_tier', 1, 0, 0xaaa);
    issue_as_owner(contract_address, registry, 0x111, 'btc_tier', 1, 0xaaa, 0, 0, c1);
    assert(registry.get_total_issued() == 1, 'Should be 1');

    let c2 = compute_commitment(0x222, 'github_dev', 2, 0, 0xbbb);
    issue_as_owner(contract_address, registry, 0x222, 'github_dev', 2, 0xbbb, 0, 0, c2);
    assert(registry.get_total_issued() == 2, 'Should be 2');

    let c3 = compute_commitment(0x333, 'leetcode_coder', 3, 0, 0xccc);
    issue_as_owner(contract_address, registry, 0x333, 'leetcode_coder', 3, 0xccc, 0, 0, c3);
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
    assert(credential.pubkey_hash == 0, 'Should be zero');
}

#[test]
fn test_verify_tier_nonexistent_fails() {
    let (_, registry) = deploy_registry();
    assert(!registry.verify_tier(0x999, 0), 'Should fail');
}

use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use starknet::ContractAddress;
use zkcred::interfaces::{
    ICredentialRegistryDispatcher, ICredentialRegistryDispatcherTrait,
    ICredentialVerifierDispatcher, ICredentialVerifierDispatcherTrait,
};
use core::poseidon::poseidon_hash_span;

fn OWNER() -> ContractAddress {
    starknet::contract_address_const::<0x123>()
}

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

fn deploy_system() -> (ICredentialRegistryDispatcher, ICredentialVerifierDispatcher) {
    // Deploy registry
    let registry_class = declare("CredentialRegistry").unwrap().contract_class();
    let (registry_address, _) = registry_class.deploy(@array![OWNER().into()]).unwrap();
    let registry = ICredentialRegistryDispatcher { contract_address: registry_address };

    // Deploy verifier
    let verifier_class = declare("CredentialVerifier").unwrap().contract_class();
    let (verifier_address, _) = verifier_class.deploy(@array![registry_address.into()]).unwrap();
    let verifier = ICredentialVerifierDispatcher { contract_address: verifier_address };

    (registry, verifier)
}

#[test]
fn test_is_whale() {
    let (registry, verifier) = deploy_system();

    let c = compute_commitment(0x123, 'btc_tier', 3, 0, 0xabc);
    let id = registry.issue_credential(0x123, 'btc_tier', 3, 0xabc, 0, 0, c);

    assert(verifier.is_whale(id), 'Should be whale');
    assert(verifier.is_fish_or_above(id), 'Should be fish+');
    assert(verifier.is_crab_or_above(id), 'Should be crab+');
    assert(verifier.is_holder(id), 'Should be holder');
}

#[test]
fn test_is_not_whale() {
    let (registry, verifier) = deploy_system();

    let c = compute_commitment(0x123, 'btc_tier', 1, 0, 0xabc);
    let id = registry.issue_credential(0x123, 'btc_tier', 1, 0xabc, 0, 0, c);

    assert(!verifier.is_whale(id), 'Should not be whale');
    assert(!verifier.is_fish_or_above(id), 'Should not be fish+');
    assert(verifier.is_crab_or_above(id), 'Should be crab+');
    assert(verifier.is_holder(id), 'Should be holder');
}

#[test]
fn test_get_tier() {
    let (registry, verifier) = deploy_system();

    let c = compute_commitment(0x123, 'btc_tier', 2, 0, 0xabc);
    let id = registry.issue_credential(0x123, 'btc_tier', 2, 0xabc, 0, 0, c);

    assert(verifier.get_tier(id) == 2, 'Wrong tier');
}

#[test]
fn test_nonexistent_returns_zero() {
    let (_, verifier) = deploy_system();

    assert(verifier.get_tier(0x999) == 0, 'Should return 0');
    assert(!verifier.is_holder(0x999), 'Should not be holder');
}

#[test]
fn test_batch_verify() {
    let (registry, verifier) = deploy_system();

    let c1 = compute_commitment(0x111, 'btc_tier', 1, 0, 0xaaa);
    let c2 = compute_commitment(0x222, 'btc_tier', 2, 0, 0xbbb);
    let c3 = compute_commitment(0x333, 'btc_tier', 3, 0, 0xccc);

    let id1 = registry.issue_credential(0x111, 'btc_tier', 1, 0xaaa, 0, 0, c1);
    let id2 = registry.issue_credential(0x222, 'btc_tier', 2, 0xbbb, 0, 0, c2);
    let id3 = registry.issue_credential(0x333, 'btc_tier', 3, 0xccc, 0, 0, c3);

    // Verify all >= tier 2
    let results = verifier.batch_verify(array![id1, id2, id3], 2);

    assert(*results.at(0) == false, 'id1 should fail tier 2');
    assert(*results.at(1) == true, 'id2 should pass tier 2');
    assert(*results.at(2) == true, 'id3 should pass tier 2');
}

#[test]
fn test_verify_github_credential() {
    let (registry, verifier) = deploy_system();

    let c = compute_commitment(0x444, 'github_dev', 3, 0xfed, 0xabc);
    let id = registry.issue_credential(0x444, 'github_dev', 3, 0xabc, 0xfed, 'github', c);

    assert(verifier.is_whale(id), 'Should be tier 3');
    assert(verifier.get_tier(id) == 3, 'Wrong tier');
}

#[test]
fn test_verify_leetcode_credential() {
    let (registry, verifier) = deploy_system();

    let c = compute_commitment(0x555, 'leetcode_coder', 2, 0xfed, 0xabc);
    let id = registry.issue_credential(0x555, 'leetcode_coder', 2, 0xabc, 0xfed, 'leetcode', c);

    assert(verifier.is_fish_or_above(id), 'Should be tier 2+');
    assert(!verifier.is_whale(id), 'Should not be tier 3');
}

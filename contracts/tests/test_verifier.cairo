use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::ContractAddress;
use zkcred::interfaces::{
    ICredentialRegistryDispatcher, ICredentialRegistryDispatcherTrait, ICredentialVerifierDispatcher,
    ICredentialVerifierDispatcherTrait,
};

fn OWNER() -> ContractAddress {
    starknet::contract_address_const::<0x123>()
}

fn deploy_registry_and_verifier() -> (
    ContractAddress, ICredentialRegistryDispatcher, ICredentialVerifierDispatcher,
) {
    // Deploy registry
    let registry_class = declare("CredentialRegistry").unwrap().contract_class();
    let (registry_address, _) = registry_class.deploy(@array![OWNER().into()]).unwrap();
    let registry = ICredentialRegistryDispatcher { contract_address: registry_address };

    // Deploy verifier
    let verifier_class = declare("CredentialVerifier").unwrap().contract_class();
    let (verifier_address, _) = verifier_class.deploy(@array![registry_address.into()]).unwrap();
    let verifier = ICredentialVerifierDispatcher { contract_address: verifier_address };

    (registry_address, registry, verifier)
}

#[test]
fn test_is_whale() {
    let (_, registry, verifier) = deploy_registry_and_verifier();

    // Issue a Whale credential (tier 3)
    let whale_id = registry.issue_credential(0x111, 'btc_tier', 3, 0xaaa);

    // Issue a Fish credential (tier 2)
    let fish_id = registry.issue_credential(0x222, 'btc_tier', 2, 0xbbb);

    assert(verifier.is_whale(whale_id), 'Whale should be whale');
    assert(!verifier.is_whale(fish_id), 'Fish should not be whale');
}

#[test]
fn test_is_fish_or_above() {
    let (_, registry, verifier) = deploy_registry_and_verifier();

    let whale_id = registry.issue_credential(0x111, 'btc_tier', 3, 0xaaa);
    let fish_id = registry.issue_credential(0x222, 'btc_tier', 2, 0xbbb);
    let crab_id = registry.issue_credential(0x333, 'btc_tier', 1, 0xccc);

    assert(verifier.is_fish_or_above(whale_id), 'Whale is fish+');
    assert(verifier.is_fish_or_above(fish_id), 'Fish is fish+');
    assert(!verifier.is_fish_or_above(crab_id), 'Crab is not fish+');
}

#[test]
fn test_is_crab_or_above() {
    let (_, registry, verifier) = deploy_registry_and_verifier();

    let whale_id = registry.issue_credential(0x111, 'btc_tier', 3, 0xaaa);
    let crab_id = registry.issue_credential(0x222, 'btc_tier', 1, 0xbbb);
    let shrimp_id = registry.issue_credential(0x333, 'btc_tier', 0, 0xccc);

    assert(verifier.is_crab_or_above(whale_id), 'Whale is crab+');
    assert(verifier.is_crab_or_above(crab_id), 'Crab is crab+');
    assert(!verifier.is_crab_or_above(shrimp_id), 'Shrimp is not crab+');
}

#[test]
fn test_is_holder() {
    let (_, registry, verifier) = deploy_registry_and_verifier();

    let shrimp_id = registry.issue_credential(0x111, 'btc_tier', 0, 0xaaa);

    assert(verifier.is_holder(shrimp_id), 'Shrimp is holder');
    assert(!verifier.is_holder(0x999), 'Nonexistent is not holder');
}

#[test]
fn test_get_tier() {
    let (_, registry, verifier) = deploy_registry_and_verifier();

    let whale_id = registry.issue_credential(0x111, 'btc_tier', 3, 0xaaa);
    let fish_id = registry.issue_credential(0x222, 'btc_tier', 2, 0xbbb);
    let crab_id = registry.issue_credential(0x333, 'btc_tier', 1, 0xccc);
    let shrimp_id = registry.issue_credential(0x444, 'btc_tier', 0, 0xddd);

    assert(verifier.get_tier(whale_id) == 3, 'Whale tier');
    assert(verifier.get_tier(fish_id) == 2, 'Fish tier');
    assert(verifier.get_tier(crab_id) == 1, 'Crab tier');
    assert(verifier.get_tier(shrimp_id) == 0, 'Shrimp tier');
}

#[test]
fn test_get_tier_nonexistent() {
    let (_, _, verifier) = deploy_registry_and_verifier();

    // Nonexistent credential should return tier 0
    assert(verifier.get_tier(0x999) == 0, 'Nonexistent should be 0');
}

#[test]
fn test_get_tier_revoked() {
    let (registry_address, registry, verifier) = deploy_registry_and_verifier();

    let credential_id = registry.issue_credential(0x111, 'btc_tier', 3, 0xaaa);
    assert(verifier.get_tier(credential_id) == 3, 'Should be 3');

    // Revoke credential (must be called by owner)
    start_cheat_caller_address(registry_address, OWNER());
    registry.revoke_credential(credential_id);
    stop_cheat_caller_address(registry_address);

    // Revoked credential should return tier 0
    assert(verifier.get_tier(credential_id) == 0, 'Revoked should be 0');
}

#[test]
fn test_batch_verify() {
    let (_, registry, verifier) = deploy_registry_and_verifier();

    let whale_id = registry.issue_credential(0x111, 'btc_tier', 3, 0xaaa);
    let fish_id = registry.issue_credential(0x222, 'btc_tier', 2, 0xbbb);
    let crab_id = registry.issue_credential(0x333, 'btc_tier', 1, 0xccc);
    let shrimp_id = registry.issue_credential(0x444, 'btc_tier', 0, 0xddd);

    // Verify all against tier 1 (Crab)
    let ids = array![whale_id, fish_id, crab_id, shrimp_id];
    let results = verifier.batch_verify(ids, 1);

    assert(*results.at(0), 'Whale >= Crab');
    assert(*results.at(1), 'Fish >= Crab');
    assert(*results.at(2), 'Crab >= Crab');
    assert(!*results.at(3), 'Shrimp < Crab');
}

#[test]
fn test_batch_verify_empty() {
    let (_, _, verifier) = deploy_registry_and_verifier();

    let ids: Array<felt252> = array![];
    let results = verifier.batch_verify(ids, 0);

    assert(results.len() == 0, 'Empty should return empty');
}

#[test]
fn test_revoked_fails_verification() {
    let (registry_address, registry, verifier) = deploy_registry_and_verifier();

    let credential_id = registry.issue_credential(0x111, 'btc_tier', 3, 0xaaa);

    // Should pass verification
    assert(verifier.is_whale(credential_id), 'Should be whale');
    assert(verifier.is_holder(credential_id), 'Should be holder');

    // Revoke (must be called by owner)
    start_cheat_caller_address(registry_address, OWNER());
    registry.revoke_credential(credential_id);
    stop_cheat_caller_address(registry_address);

    // Should fail verification
    assert(!verifier.is_whale(credential_id), 'Revoked not whale');
    assert(!verifier.is_holder(credential_id), 'Revoked not holder');
}

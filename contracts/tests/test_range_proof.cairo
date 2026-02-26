use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::ContractAddress;
use zkcred::range_proof_verifier::{
    IRangeProofVerifierDispatcher, IRangeProofVerifierDispatcherTrait,
};

fn OWNER() -> ContractAddress {
    starknet::contract_address_const::<0x123>()
}

fn deploy_verifier() -> (ContractAddress, IRangeProofVerifierDispatcher) {
    let contract = declare("RangeProofVerifier").unwrap().contract_class();
    let constructor_args = array![OWNER().into()];
    let (contract_address, _) = contract.deploy(@constructor_args).unwrap();

    let dispatcher = IRangeProofVerifierDispatcher { contract_address };
    (contract_address, dispatcher)
}

#[test]
fn test_initial_state() {
    let (_, verifier) = deploy_verifier();

    assert(verifier.get_total_proofs() == 0, 'Should start with 0');
    assert(verifier.get_owner() == OWNER(), 'Wrong owner');
}

#[test]
fn test_tier_boundaries_default() {
    let (_, verifier) = deploy_verifier();

    let (min0, max0) = verifier.get_tier_bounds(0);
    assert(min0 == 0, 'Tier 0 min wrong');
    assert(max0 == 99999999, 'Tier 0 max wrong');

    let (min1, _) = verifier.get_tier_bounds(1);
    assert(min1 == 100000000, 'Tier 1 min wrong');

    let (min3, _) = verifier.get_tier_bounds(3);
    assert(min3 == 10000000000, 'Tier 3 min wrong');

    // [H-5] Tier 3 should be explicitly unbounded
    assert(verifier.is_tier_unbounded(3), 'Tier 3 should be unbounded');
    assert(!verifier.is_tier_unbounded(0), 'Tier 0 not unbounded');
}

// [C-2 FIX] Oracle-attested range proof — no secrets on-chain
#[test]
fn test_oracle_attested_proof_tier0() {
    let (contract_address, verifier) = deploy_verifier();

    let commitment: felt252 = 0xabcdef123456;
    let credential_id: felt252 = 0x111;

    // Owner (oracle) attests the range proof
    start_cheat_caller_address(contract_address, OWNER());
    let result = verifier.verify_range_proof(credential_id, commitment, 0);
    stop_cheat_caller_address(contract_address);

    assert(result, 'Proof should be attested');
    assert(verifier.is_proven(credential_id), 'Should be proven');

    let (verified, tier, stored) = verifier.get_proof(credential_id);
    assert(verified, 'Should be verified');
    assert(tier == 0, 'Wrong tier');
    assert(stored == commitment, 'Wrong commitment');
}

#[test]
fn test_oracle_attested_proof_tier3() {
    let (contract_address, verifier) = deploy_verifier();

    let commitment: felt252 = 0xfeedface;

    start_cheat_caller_address(contract_address, OWNER());
    let result = verifier.verify_range_proof(0x333, commitment, 3);
    stop_cheat_caller_address(contract_address);

    assert(result, 'Tier 3 proof should verify');
}

// [H-3 FIX] Non-owner cannot submit proofs
#[test]
#[should_panic(expected: 'Caller is not owner')]
fn test_non_owner_cannot_attest() {
    let (contract_address, verifier) = deploy_verifier();

    let attacker = starknet::contract_address_const::<0x999>();
    start_cheat_caller_address(contract_address, attacker);
    verifier.verify_range_proof(0x444, 0xbadbeef, 0);
    stop_cheat_caller_address(contract_address);
}

// [H-5 FIX] Explicit unbounded flag
#[test]
fn test_set_tier_bounds_with_unbounded() {
    let (contract_address, verifier) = deploy_verifier();

    start_cheat_caller_address(contract_address, OWNER());
    // Set tier 2 to unbounded
    verifier.set_tier_bounds(2, 1000000000, 0, true);
    stop_cheat_caller_address(contract_address);

    assert(verifier.is_tier_unbounded(2), 'Should be unbounded');
    let (min, _) = verifier.get_tier_bounds(2);
    assert(min == 1000000000, 'Min should be set');
}

#[test]
fn test_set_tier_bounds_bounded() {
    let (contract_address, verifier) = deploy_verifier();

    start_cheat_caller_address(contract_address, OWNER());
    verifier.set_tier_bounds(0, 0, 50000000, false);
    stop_cheat_caller_address(contract_address);

    assert(!verifier.is_tier_unbounded(0), 'Should be bounded');
    let (min, max) = verifier.get_tier_bounds(0);
    assert(min == 0, 'Min should be 0');
    assert(max == 50000000, 'Max should be updated');
}

#[test]
#[should_panic(expected: 'Caller is not owner')]
fn test_set_tier_bounds_not_owner() {
    let (contract_address, verifier) = deploy_verifier();

    let non_owner = starknet::contract_address_const::<0x999>();
    start_cheat_caller_address(contract_address, non_owner);
    verifier.set_tier_bounds(0, 0, 100, false);
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_total_proofs_counter() {
    let (contract_address, verifier) = deploy_verifier();

    start_cheat_caller_address(contract_address, OWNER());
    verifier.verify_range_proof(0x001, 0xaaa, 0);
    verifier.verify_range_proof(0x002, 0xbbb, 1);
    stop_cheat_caller_address(contract_address);

    assert(verifier.get_total_proofs() == 2, 'Should have 2 proofs');
}

#[test]
fn test_not_proven_by_default() {
    let (_, verifier) = deploy_verifier();
    assert(!verifier.is_proven(0x999), 'Should not be proven');
}

#[test]
#[should_panic(expected: 'Empty commitment')]
fn test_zero_commitment_rejected() {
    let (contract_address, verifier) = deploy_verifier();

    start_cheat_caller_address(contract_address, OWNER());
    verifier.verify_range_proof(0x555, 0, 0);
    stop_cheat_caller_address(contract_address);
}

// [M-2] Re-attesting same credential_id should NOT inflate counter
#[test]
fn test_reattestation_does_not_inflate_counter() {
    let (contract_address, verifier) = deploy_verifier();

    start_cheat_caller_address(contract_address, OWNER());
    verifier.verify_range_proof(0x001, 0xaaa, 0);
    assert(verifier.get_total_proofs() == 1, 'Should be 1 after first');

    // Re-attest same credential with updated tier
    verifier.verify_range_proof(0x001, 0xbbb, 1);
    assert(verifier.get_total_proofs() == 1, 'Should still be 1');

    // Different credential should increment
    verifier.verify_range_proof(0x002, 0xccc, 2);
    assert(verifier.get_total_proofs() == 2, 'Should be 2 now');
    stop_cheat_caller_address(contract_address);
}

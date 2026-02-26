use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::ContractAddress;
use zkcred::range_proof_verifier::{
    IRangeProofVerifierDispatcher, IRangeProofVerifierDispatcherTrait,
};
use core::pedersen::PedersenTrait;
use core::hash::HashStateTrait;

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

/// Helper: compute Pedersen commitment matching the contract
fn compute_pedersen_commitment(value: felt252, blinding_factor: felt252) -> felt252 {
    PedersenTrait::new(value).update(blinding_factor).finalize()
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

    let (min3, max3) = verifier.get_tier_bounds(3);
    assert(min3 == 10000000000, 'Tier 3 min wrong');
    assert(max3 == 0, 'Tier 3 max unbounded');
}

#[test]
fn test_verify_range_proof_tier0() {
    let (_, verifier) = deploy_verifier();

    let value: felt252 = 50000000; // 0.5 BTC in satoshis (Tier 0)
    let blinding: felt252 = 0xdeadbeef;
    let commitment = compute_pedersen_commitment(value, blinding);
    let credential_id: felt252 = 0x111;

    let result = verifier.verify_range_proof(credential_id, commitment, value, blinding, 0);
    assert(result, 'Proof should verify for tier 0');

    assert(verifier.is_proven(credential_id), 'Should be proven');

    let (verified, tier, stored_commitment) = verifier.get_proof(credential_id);
    assert(verified, 'Should be verified');
    assert(tier == 0, 'Wrong tier');
    assert(stored_commitment == commitment, 'Wrong commitment');
}

#[test]
fn test_verify_range_proof_tier1() {
    let (_, verifier) = deploy_verifier();

    let value: felt252 = 500000000; // 5 BTC in satoshis (Tier 1)
    let blinding: felt252 = 0xcafe;
    let commitment = compute_pedersen_commitment(value, blinding);

    let result = verifier.verify_range_proof(0x222, commitment, value, blinding, 1);
    assert(result, 'Proof should verify for tier 1');
}

#[test]
fn test_verify_range_proof_tier3_unbounded() {
    let (_, verifier) = deploy_verifier();

    let value: felt252 = 50000000000; // 500 BTC in satoshis (Tier 3, unbounded upper)
    let blinding: felt252 = 0xbabe;
    let commitment = compute_pedersen_commitment(value, blinding);

    let result = verifier.verify_range_proof(0x333, commitment, value, blinding, 3);
    assert(result, 'Proof should verify for tier 3');
}

#[test]
fn test_wrong_commitment_fails() {
    let (_, verifier) = deploy_verifier();

    let value: felt252 = 50000000;
    let blinding: felt252 = 0xdeadbeef;
    let fake_commitment: felt252 = 0x12345; // Not the real commitment

    let result = verifier.verify_range_proof(0x444, fake_commitment, value, blinding, 0);
    assert(!result, 'Should fail wrong commit');
}

#[test]
fn test_value_out_of_range_fails() {
    let (_, verifier) = deploy_verifier();

    // Value is 500 BTC (tier 3), but claiming tier 0
    let value: felt252 = 50000000000;
    let blinding: felt252 = 0xfeed;
    let commitment = compute_pedersen_commitment(value, blinding);

    let result = verifier.verify_range_proof(0x555, commitment, value, blinding, 0);
    assert(!result, 'Should fail out of range');
}

#[test]
fn test_value_below_tier_min_fails() {
    let (_, verifier) = deploy_verifier();

    // Value is 0.5 BTC (tier 0), but claiming tier 2
    let value: felt252 = 50000000;
    let blinding: felt252 = 0xbeef;
    let commitment = compute_pedersen_commitment(value, blinding);

    let result = verifier.verify_range_proof(0x666, commitment, value, blinding, 2);
    assert(!result, 'Should fail: below tier 2 min');
}

#[test]
fn test_set_tier_bounds() {
    let (contract_address, verifier) = deploy_verifier();

    start_cheat_caller_address(contract_address, OWNER());
    verifier.set_tier_bounds(0, 0, 50000000);
    stop_cheat_caller_address(contract_address);

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
    verifier.set_tier_bounds(0, 0, 100);
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_total_proofs_counter() {
    let (_, verifier) = deploy_verifier();

    let v1: felt252 = 50000000;
    let b1: felt252 = 0xaaa;
    let c1 = compute_pedersen_commitment(v1, b1);
    verifier.verify_range_proof(0x001, c1, v1, b1, 0);

    let v2: felt252 = 500000000;
    let b2: felt252 = 0xbbb;
    let c2 = compute_pedersen_commitment(v2, b2);
    verifier.verify_range_proof(0x002, c2, v2, b2, 1);

    assert(verifier.get_total_proofs() == 2, 'Should have 2 proofs');
}

#[test]
fn test_not_proven_by_default() {
    let (_, verifier) = deploy_verifier();
    assert(!verifier.is_proven(0x999), 'Should not be proven');
}

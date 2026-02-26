use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::ContractAddress;
use zkcred::interfaces::{ICredentialMerkleDispatcher, ICredentialMerkleDispatcherTrait};
use core::poseidon::poseidon_hash_span;

fn OWNER() -> ContractAddress {
    starknet::contract_address_const::<0x123>()
}

fn deploy_merkle() -> (ContractAddress, ICredentialMerkleDispatcher) {
    let contract = declare("CredentialMerkle").unwrap().contract_class();
    let constructor_args = array![OWNER().into()];
    let (contract_address, _) = contract.deploy(@constructor_args).unwrap();

    let dispatcher = ICredentialMerkleDispatcher { contract_address };
    (contract_address, dispatcher)
}

#[test]
fn test_initial_state() {
    let (_, merkle) = deploy_merkle();

    assert(merkle.get_leaf_count() == 0, 'Should start with 0 leaves');
    // Root should be the precomputed zero hash at depth 20
    let root = merkle.get_root();
    assert(root != 0, 'Root should be non-zero');
}

#[test]
fn test_insert_single_leaf() {
    let (contract_address, merkle) = deploy_merkle();

    let commitment: felt252 = 0xdeadbeef;

    start_cheat_caller_address(contract_address, OWNER());
    let index = merkle.insert_leaf(commitment);
    stop_cheat_caller_address(contract_address);

    assert(index == 0, 'First leaf should be index 0');
    assert(merkle.get_leaf_count() == 1, 'Should have 1 leaf');

    // Root should have changed from initial
    let root = merkle.get_root();
    assert(root != 0, 'Root should be non-zero');
}

#[test]
fn test_insert_multiple_leaves() {
    let (contract_address, merkle) = deploy_merkle();

    start_cheat_caller_address(contract_address, OWNER());

    let idx0 = merkle.insert_leaf(0x111);
    let root_after_1 = merkle.get_root();

    let idx1 = merkle.insert_leaf(0x222);
    let root_after_2 = merkle.get_root();

    let idx2 = merkle.insert_leaf(0x333);
    let root_after_3 = merkle.get_root();

    stop_cheat_caller_address(contract_address);

    assert(idx0 == 0, 'Wrong index 0');
    assert(idx1 == 1, 'Wrong index 1');
    assert(idx2 == 2, 'Wrong index 2');
    assert(merkle.get_leaf_count() == 3, 'Should have 3 leaves');

    // Each insertion should produce a different root
    assert(root_after_1 != root_after_2, 'Roots should differ (1 vs 2)');
    assert(root_after_2 != root_after_3, 'Roots should differ (2 vs 3)');
}

#[test]
fn test_root_changes_with_each_insert() {
    let (contract_address, merkle) = deploy_merkle();

    let initial_root = merkle.get_root();

    start_cheat_caller_address(contract_address, OWNER());
    merkle.insert_leaf(0xabc);
    stop_cheat_caller_address(contract_address);

    let new_root = merkle.get_root();
    assert(initial_root != new_root, 'Root should change on insert');
}

#[test]
fn test_owner() {
    let (_, merkle) = deploy_merkle();
    assert(merkle.get_owner() == OWNER(), 'Wrong owner');
}

#[test]
#[should_panic(expected: 'Caller is not owner')]
fn test_insert_not_owner_fails() {
    let (contract_address, merkle) = deploy_merkle();

    let non_owner = starknet::contract_address_const::<0x999>();
    start_cheat_caller_address(contract_address, non_owner);
    merkle.insert_leaf(0xabc);
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_verify_proof_single_leaf() {
    let (contract_address, merkle) = deploy_merkle();

    let commitment: felt252 = 0xdeadbeef;

    start_cheat_caller_address(contract_address, OWNER());
    merkle.insert_leaf(commitment);
    stop_cheat_caller_address(contract_address);

    // Build the proof manually for leaf at index 0
    // At depth 20, we need 20 sibling hashes
    // For a single leaf, all siblings are zero hashes

    // Compute zero hashes for each level
    let mut zeros: Array<felt252> = array![];
    let mut current_zero: felt252 = 0;
    zeros.append(current_zero);

    let mut i: u32 = 1;
    while i <= 20 {
        current_zero = poseidon_hash_span(array![current_zero, current_zero].span());
        zeros.append(current_zero);
        i += 1;
    };

    // Proof for index 0: all siblings are the zero values at each level
    let mut proof: Array<felt252> = array![];
    let mut level: u32 = 0;
    while level < 20 {
        proof.append(*zeros.at(level));
        level += 1;
    };

    let is_valid = merkle.verify_proof(commitment, proof, 0);
    assert(is_valid, 'Proof should be valid');
}

#[test]
fn test_verify_proof_invalid_leaf() {
    let (contract_address, merkle) = deploy_merkle();

    start_cheat_caller_address(contract_address, OWNER());
    merkle.insert_leaf(0xdeadbeef);
    stop_cheat_caller_address(contract_address);

    // Build the same proof as above, but use a wrong leaf
    let mut zeros: Array<felt252> = array![];
    let mut current_zero: felt252 = 0;
    zeros.append(current_zero);

    let mut i: u32 = 1;
    while i <= 20 {
        current_zero = poseidon_hash_span(array![current_zero, current_zero].span());
        zeros.append(current_zero);
        i += 1;
    };

    let mut proof: Array<felt252> = array![];
    let mut level: u32 = 0;
    while level < 20 {
        proof.append(*zeros.at(level));
        level += 1;
    };

    // Wrong leaf -> proof should fail
    let is_valid = merkle.verify_proof(0xbadc0de, proof, 0);
    assert(!is_valid, 'Should reject wrong leaf');
}

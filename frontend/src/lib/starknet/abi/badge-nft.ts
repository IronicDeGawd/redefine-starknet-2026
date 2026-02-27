/**
 * BadgeNFT contract ABI
 * Generated from Cairo contract interface
 */

export const BADGE_NFT_ABI = [
  {
    type: "impl",
    name: "BadgeNFTImpl",
    interface_name: "zkcred::interfaces::IBadgeNFT",
  },
  {
    type: "struct",
    name: "core::integer::u256",
    members: [
      { name: "low", type: "core::integer::u128" },
      { name: "high", type: "core::integer::u128" },
    ],
  },
  {
    type: "struct",
    name: "zkcred::interfaces::BadgeData",
    members: [
      { name: "credential_type", type: "core::felt252" },
      { name: "tier", type: "core::integer::u8" },
      { name: "credential_id", type: "core::felt252" },
    ],
  },
  {
    type: "interface",
    name: "zkcred::interfaces::IBadgeNFT",
    items: [
      {
        type: "function",
        name: "mint",
        inputs: [
          { name: "recipient", type: "core::starknet::contract_address::ContractAddress" },
          { name: "credential_id", type: "core::felt252" },
        ],
        outputs: [{ type: "core::integer::u256" }],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "owner_of",
        inputs: [{ name: "token_id", type: "core::integer::u256" }],
        outputs: [{ type: "core::starknet::contract_address::ContractAddress" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "balance_of",
        inputs: [
          { name: "owner", type: "core::starknet::contract_address::ContractAddress" },
        ],
        outputs: [{ type: "core::integer::u256" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_badge_data",
        inputs: [{ name: "token_id", type: "core::integer::u256" }],
        outputs: [
          { type: "(core::felt252, core::integer::u8)" },
        ],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "has_badge",
        inputs: [{ name: "credential_id", type: "core::felt252" }],
        outputs: [{ type: "core::bool" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_total_supply",
        inputs: [],
        outputs: [{ type: "core::integer::u256" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_base_uri",
        inputs: [],
        outputs: [{ type: "core::byte_array::ByteArray" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "set_base_uri",
        inputs: [{ name: "new_base_uri", type: "core::byte_array::ByteArray" }],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "get_owner",
        inputs: [],
        outputs: [{ type: "core::starknet::contract_address::ContractAddress" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "transfer_ownership",
        inputs: [{ name: "new_owner", type: "core::starknet::contract_address::ContractAddress" }],
        outputs: [],
        state_mutability: "external",
      },
    ],
  },
  {
    type: "constructor",
    name: "constructor",
    inputs: [
      { name: "owner", type: "core::starknet::contract_address::ContractAddress" },
      { name: "registry_address", type: "core::starknet::contract_address::ContractAddress" },
      { name: "base_uri", type: "core::byte_array::ByteArray" },
    ],
  },
  {
    type: "event",
    name: "zkcred::badge_nft::BadgeNFT::Transfer",
    kind: "struct",
    members: [
      { name: "from", type: "core::starknet::contract_address::ContractAddress", kind: "key" },
      { name: "to", type: "core::starknet::contract_address::ContractAddress", kind: "key" },
      { name: "token_id", type: "core::integer::u256", kind: "key" },
    ],
  },
  {
    type: "event",
    name: "zkcred::badge_nft::BadgeNFT::BadgeMinted",
    kind: "struct",
    members: [
      { name: "token_id", type: "core::integer::u256", kind: "key" },
      { name: "credential_id", type: "core::felt252", kind: "key" },
      { name: "credential_type", type: "core::felt252", kind: "data" },
      { name: "tier", type: "core::integer::u8", kind: "data" },
    ],
  },
  {
    type: "event",
    name: "zkcred::badge_nft::BadgeNFT::Event",
    kind: "enum",
    variants: [
      { name: "Transfer", type: "zkcred::badge_nft::BadgeNFT::Transfer", kind: "nested" },
      { name: "BadgeMinted", type: "zkcred::badge_nft::BadgeNFT::BadgeMinted", kind: "nested" },
    ],
  },
] as const;

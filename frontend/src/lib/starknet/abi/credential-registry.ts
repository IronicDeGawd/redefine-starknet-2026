/**
 * CredentialRegistry contract ABI
 * Generated from Cairo contract interface
 */

export const CREDENTIAL_REGISTRY_ABI = [
  {
    type: "impl",
    name: "CredentialRegistryImpl",
    interface_name: "zkcred::interfaces::ICredentialRegistry",
  },
  {
    type: "struct",
    name: "zkcred::interfaces::Credential",
    members: [
      { name: "pubkey_hash", type: "core::felt252" },
      { name: "credential_type", type: "core::felt252" },
      { name: "tier", type: "core::integer::u8" },
      { name: "issued_at", type: "core::integer::u64" },
      { name: "revoked", type: "core::bool" },
      { name: "verification_hash", type: "core::felt252" },
      { name: "oracle_provider", type: "core::felt252" },
    ],
  },
  {
    type: "interface",
    name: "zkcred::interfaces::ICredentialRegistry",
    items: [
      {
        type: "function",
        name: "issue_credential",
        inputs: [
          { name: "pubkey_hash", type: "core::felt252" },
          { name: "credential_type", type: "core::felt252" },
          { name: "tier", type: "core::integer::u8" },
          { name: "salt", type: "core::felt252" },
          { name: "verification_hash", type: "core::felt252" },
          { name: "oracle_provider", type: "core::felt252" },
        ],
        outputs: [{ type: "core::felt252" }],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "revoke_credential",
        inputs: [{ name: "credential_id", type: "core::felt252" }],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "get_credential",
        inputs: [{ name: "credential_id", type: "core::felt252" }],
        outputs: [{ type: "zkcred::interfaces::Credential" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "is_issued",
        inputs: [{ name: "pubkey_hash", type: "core::felt252" }],
        outputs: [{ type: "core::bool" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "verify_tier",
        inputs: [
          { name: "credential_id", type: "core::felt252" },
          { name: "min_tier", type: "core::integer::u8" },
        ],
        outputs: [{ type: "core::bool" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_owner",
        inputs: [],
        outputs: [{ type: "core::starknet::contract_address::ContractAddress" }],
        state_mutability: "view",
      },
    ],
  },
  {
    type: "constructor",
    name: "constructor",
    inputs: [
      { name: "owner", type: "core::starknet::contract_address::ContractAddress" },
    ],
  },
  {
    type: "event",
    name: "zkcred::credential_registry::CredentialRegistry::CredentialIssued",
    kind: "struct",
    members: [
      { name: "credential_id", type: "core::felt252", kind: "key" },
      { name: "credential_type", type: "core::felt252", kind: "data" },
      { name: "tier", type: "core::integer::u8", kind: "data" },
      { name: "timestamp", type: "core::integer::u64", kind: "data" },
      { name: "verification_hash", type: "core::felt252", kind: "data" },
      { name: "oracle_provider", type: "core::felt252", kind: "data" },
    ],
  },
  {
    type: "event",
    name: "zkcred::credential_registry::CredentialRegistry::CredentialRevoked",
    kind: "struct",
    members: [
      { name: "credential_id", type: "core::felt252", kind: "key" },
      { name: "timestamp", type: "core::integer::u64", kind: "data" },
    ],
  },
  {
    type: "event",
    name: "zkcred::credential_registry::CredentialRegistry::Event",
    kind: "enum",
    variants: [
      {
        name: "CredentialIssued",
        type: "zkcred::credential_registry::CredentialRegistry::CredentialIssued",
        kind: "nested",
      },
      {
        name: "CredentialRevoked",
        type: "zkcred::credential_registry::CredentialRegistry::CredentialRevoked",
        kind: "nested",
      },
    ],
  },
] as const;

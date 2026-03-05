/**
 * Deploy ZKCred contracts to Starknet Sepolia
 *
 * Usage: node scripts/deploy.js
 *
 * Required env vars:
 *   STARKNET_PRIVATE_KEY - Account private key
 *   STARKNET_ACCOUNT_ADDRESS - Account address (must be deployed and funded)
 */

const {
  Account,
  RpcProvider,
  CallData,
  stark,
  hash,
} = require("starknet");
const fs = require("fs");
const path = require("path");

// Config
const RPC_URL = "https://rpc.starknet-testnet.lava.build/rpc/v0_8";

// Contract artifacts paths
const CONTRACTS_DIR = path.join(__dirname, "..", "target", "dev");

const CONTRACTS = {
  CredentialRegistry: {
    sierra: path.join(CONTRACTS_DIR, "zkcred_CredentialRegistry.contract_class.json"),
    casm: path.join(CONTRACTS_DIR, "zkcred_CredentialRegistry.compiled_contract_class.json"),
  },
  CredentialVerifier: {
    sierra: path.join(CONTRACTS_DIR, "zkcred_CredentialVerifier.contract_class.json"),
    casm: path.join(CONTRACTS_DIR, "zkcred_CredentialVerifier.compiled_contract_class.json"),
  },
  CredentialMerkle: {
    sierra: path.join(CONTRACTS_DIR, "zkcred_CredentialMerkle.contract_class.json"),
    casm: path.join(CONTRACTS_DIR, "zkcred_CredentialMerkle.compiled_contract_class.json"),
  },
  RangeProofVerifier: {
    sierra: path.join(CONTRACTS_DIR, "zkcred_RangeProofVerifier.contract_class.json"),
    casm: path.join(CONTRACTS_DIR, "zkcred_RangeProofVerifier.compiled_contract_class.json"),
  },
};

async function declareAndDeploy(account, provider, name, sierraPath, casmPath, constructorCalldata) {
  console.log(`\n--- ${name} ---`);

  const sierra = JSON.parse(fs.readFileSync(sierraPath, "utf8"));
  const casm = JSON.parse(fs.readFileSync(casmPath, "utf8"));

  // Declare
  console.log("Declaring...");
  let classHash;
  try {
    const declareResponse = await account.declare({
      contract: sierra,
      casm: casm,
    });
    classHash = declareResponse.class_hash;
    console.log("Declared class hash:", classHash);
    await provider.waitForTransaction(declareResponse.transaction_hash);
  } catch (e) {
    if (e.message?.includes("already declared") || e.message?.includes("AlreadyDeclared")) {
      classHash = hash.computeContractClassHash(sierra);
      console.log("Already declared, class hash:", classHash);
    } else {
      throw e;
    }
  }

  // Deploy
  console.log("Deploying...");
  const deployResult = await account.deployContract({
    classHash,
    constructorCalldata,
    salt: stark.randomAddress(),
  });

  await provider.waitForTransaction(deployResult.transaction_hash);
  const address = deployResult.contract_address;
  console.log(`${name} deployed at:`, address);

  return address;
}

async function main() {
  console.log("=== ZKCred Contract Deployment (4 contracts) ===\n");

  // Check env vars
  const privateKey = process.env.STARKNET_PRIVATE_KEY;
  const accountAddress = process.env.STARKNET_ACCOUNT_ADDRESS;

  if (!privateKey || !accountAddress) {
    console.error("Error: STARKNET_PRIVATE_KEY and STARKNET_ACCOUNT_ADDRESS must be set");
    console.error("\nExample:");
    console.error("  export STARKNET_PRIVATE_KEY=0x...");
    console.error("  export STARKNET_ACCOUNT_ADDRESS=0x...");
    process.exit(1);
  }

  // Check artifacts exist
  for (const [name, paths] of Object.entries(CONTRACTS)) {
    if (!fs.existsSync(paths.sierra)) {
      console.error(`Missing: ${paths.sierra}`);
      console.error("Run: cd contracts && scarb build");
      process.exit(1);
    }
  }

  // Setup provider and account
  console.log("Connecting to Sepolia...");
  const provider = new RpcProvider({ nodeUrl: RPC_URL });

  const account = new Account({ provider, address: accountAddress, signer: privateKey });
  console.log("Account:", accountAddress);

  try {
    const nonce = await provider.getNonceForAddress(accountAddress);
    console.log("Account nonce:", nonce);
  } catch (e) {
    console.error("\nError: Account not deployed or not found.");
    console.error("Make sure the account is deployed and funded.");
    console.error("Get testnet STRK from: https://starknet-faucet.vercel.app/");
    process.exit(1);
  }

  // ====== Deploy all 4 contracts ======

  // 1. CredentialRegistry (owner = deployer)
  const registryAddress = await declareAndDeploy(
    account, provider, "CredentialRegistry",
    CONTRACTS.CredentialRegistry.sierra,
    CONTRACTS.CredentialRegistry.casm,
    CallData.compile({ owner: accountAddress })
  );

  // 2. CredentialVerifier (linked to registry)
  const verifierAddress = await declareAndDeploy(
    account, provider, "CredentialVerifier",
    CONTRACTS.CredentialVerifier.sierra,
    CONTRACTS.CredentialVerifier.casm,
    CallData.compile({ registry: registryAddress })
  );

  // 3. CredentialMerkle (owner = deployer)
  const merkleAddress = await declareAndDeploy(
    account, provider, "CredentialMerkle",
    CONTRACTS.CredentialMerkle.sierra,
    CONTRACTS.CredentialMerkle.casm,
    CallData.compile({ owner: accountAddress })
  );

  // 4. RangeProofVerifier (owner = deployer)
  const rangeProofAddress = await declareAndDeploy(
    account, provider, "RangeProofVerifier",
    CONTRACTS.RangeProofVerifier.sierra,
    CONTRACTS.RangeProofVerifier.casm,
    CallData.compile({ owner: accountAddress })
  );

  // ====== Summary ======
  console.log("\n=== Deployment Complete ===\n");
  console.log("CredentialRegistry: ", registryAddress);
  console.log("CredentialVerifier: ", verifierAddress);
  console.log("CredentialMerkle:   ", merkleAddress);
  console.log("RangeProofVerifier: ", rangeProofAddress);
  console.log("\n--- Add to frontend/.env.local ---");
  console.log(`CREDENTIAL_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`CREDENTIAL_VERIFIER_ADDRESS=${verifierAddress}`);
  console.log(`CREDENTIAL_MERKLE_ADDRESS=${merkleAddress}`);
  console.log(`RANGE_PROOF_VERIFIER_ADDRESS=${rangeProofAddress}`);
  console.log("\n--- View on explorer ---");
  console.log(`https://sepolia.starkscan.co/contract/${registryAddress}`);
  console.log(`https://sepolia.starkscan.co/contract/${verifierAddress}`);
  console.log(`https://sepolia.starkscan.co/contract/${merkleAddress}`);
  console.log(`https://sepolia.starkscan.co/contract/${rangeProofAddress}`);
}

main().catch((e) => {
  console.error("Deployment failed:", e);
  process.exit(1);
});

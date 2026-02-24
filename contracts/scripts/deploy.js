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
const REGISTRY_SIERRA = path.join(
  CONTRACTS_DIR,
  "zkcred_CredentialRegistry.contract_class.json"
);
const REGISTRY_CASM = path.join(
  CONTRACTS_DIR,
  "zkcred_CredentialRegistry.compiled_contract_class.json"
);
const VERIFIER_SIERRA = path.join(
  CONTRACTS_DIR,
  "zkcred_CredentialVerifier.contract_class.json"
);
const VERIFIER_CASM = path.join(
  CONTRACTS_DIR,
  "zkcred_CredentialVerifier.compiled_contract_class.json"
);

async function main() {
  console.log("=== ZKCred Contract Deployment ===\n");

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

  // Setup provider and account
  console.log("Connecting to Sepolia...");
  const provider = new RpcProvider({ nodeUrl: RPC_URL });

  const account = new Account({
    provider,
    address: accountAddress,
    signer: privateKey,
  });

  // Check account exists
  console.log("Account:", accountAddress);

  try {
    const nonce = await provider.getNonceForAddress(accountAddress);
    console.log("Account nonce:", nonce);
  } catch (e) {
    console.error("\nError: Account not deployed or not found.");
    console.error("Make sure the account is deployed and funded.");
    console.error("Get testnet ETH from: https://starknet-faucet.vercel.app/");
    process.exit(1);
  }

  // Load contract artifacts
  console.log("\nLoading contract artifacts...");
  const registrySierra = JSON.parse(fs.readFileSync(REGISTRY_SIERRA, "utf8"));
  const registryCasm = JSON.parse(fs.readFileSync(REGISTRY_CASM, "utf8"));
  const verifierSierra = JSON.parse(fs.readFileSync(VERIFIER_SIERRA, "utf8"));
  const verifierCasm = JSON.parse(fs.readFileSync(VERIFIER_CASM, "utf8"));

  // ====== Deploy CredentialRegistry ======
  console.log("\n--- Deploying CredentialRegistry ---");

  // Declare
  console.log("Declaring...");
  let registryClassHash;
  try {
    const declareResponse = await account.declare({
      contract: registrySierra,
      casm: registryCasm,
    });
    registryClassHash = declareResponse.class_hash;
    console.log("Declared class hash:", registryClassHash);
    await provider.waitForTransaction(declareResponse.transaction_hash);
  } catch (e) {
    // Already declared
    if (e.message?.includes("already declared")) {
      registryClassHash = hash.computeContractClassHash(registrySierra);
      console.log("Already declared, class hash:", registryClassHash);
    } else {
      throw e;
    }
  }

  // Deploy
  console.log("Deploying...");
  const registryCalldata = CallData.compile({
    owner: accountAddress,
  });

  const registryDeploy = await account.deployContract({
    classHash: registryClassHash,
    constructorCalldata: registryCalldata,
    salt: stark.randomAddress(),
  });

  await provider.waitForTransaction(registryDeploy.transaction_hash);
  const registryAddress = registryDeploy.contract_address;
  console.log("CredentialRegistry deployed at:", registryAddress);

  // ====== Deploy CredentialVerifier ======
  console.log("\n--- Deploying CredentialVerifier ---");

  // Declare
  console.log("Declaring...");
  let verifierClassHash;
  try {
    const declareResponse = await account.declare({
      contract: verifierSierra,
      casm: verifierCasm,
    });
    verifierClassHash = declareResponse.class_hash;
    console.log("Declared class hash:", verifierClassHash);
    await provider.waitForTransaction(declareResponse.transaction_hash);
  } catch (e) {
    if (e.message?.includes("already declared")) {
      verifierClassHash = hash.computeContractClassHash(verifierSierra);
      console.log("Already declared, class hash:", verifierClassHash);
    } else {
      throw e;
    }
  }

  // Deploy
  console.log("Deploying...");
  const verifierCalldata = CallData.compile({
    registry: registryAddress,
  });

  const verifierDeploy = await account.deployContract({
    classHash: verifierClassHash,
    constructorCalldata: verifierCalldata,
    salt: stark.randomAddress(),
  });

  await provider.waitForTransaction(verifierDeploy.transaction_hash);
  const verifierAddress = verifierDeploy.contract_address;
  console.log("CredentialVerifier deployed at:", verifierAddress);

  // ====== Summary ======
  console.log("\n=== Deployment Complete ===\n");
  console.log("CredentialRegistry:", registryAddress);
  console.log("CredentialVerifier:", verifierAddress);
  console.log("\nAdd to frontend/.env.local:");
  console.log(`CREDENTIAL_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`CREDENTIAL_VERIFIER_ADDRESS=${verifierAddress}`);
  console.log("\nView on explorer:");
  console.log(`https://sepolia.starkscan.co/contract/${registryAddress}`);
  console.log(`https://sepolia.starkscan.co/contract/${verifierAddress}`);
}

main().catch((e) => {
  console.error("Deployment failed:", e);
  process.exit(1);
});

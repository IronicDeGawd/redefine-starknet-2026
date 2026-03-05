/**
 * Deploy BadgeNFT contract to Starknet Sepolia
 *
 * Usage: node scripts/deploy-badge-nft.js
 *
 * Required env vars:
 *   STARKNET_PRIVATE_KEY       - Account private key
 *   STARKNET_ACCOUNT_ADDRESS   - Account address (must be deployed and funded)
 *   CREDENTIAL_REGISTRY_ADDRESS - Already-deployed CredentialRegistry address
 *
 * Optional:
 *   BASE_URI - Base URI for NFT metadata (default: https://zkcred.xyz/api/nft/metadata)
 */

const {
  Account,
  RpcProvider,
  CallData,
  stark,
  hash,
  byteArray,
} = require("starknet");
const fs = require("fs");
const path = require("path");

const RPC_URL = "https://rpc.starknet-testnet.lava.build/rpc/v0_8";
const CONTRACTS_DIR = path.join(__dirname, "..", "target", "dev");

const BADGE_NFT = {
  sierra: path.join(CONTRACTS_DIR, "zkcred_BadgeNFT.contract_class.json"),
  casm: path.join(CONTRACTS_DIR, "zkcred_BadgeNFT.compiled_contract_class.json"),
};

async function main() {
  console.log("=== BadgeNFT Deployment ===\n");

  const privateKey = process.env.STARKNET_PRIVATE_KEY;
  const accountAddress = process.env.STARKNET_ACCOUNT_ADDRESS;
  const registryAddress = process.env.CREDENTIAL_REGISTRY_ADDRESS;

  if (!privateKey || !accountAddress) {
    console.error("Error: STARKNET_PRIVATE_KEY and STARKNET_ACCOUNT_ADDRESS must be set");
    process.exit(1);
  }

  if (!registryAddress) {
    console.error("Error: CREDENTIAL_REGISTRY_ADDRESS must be set");
    console.error("This is the already-deployed CredentialRegistry contract address.");
    process.exit(1);
  }

  // Check artifacts
  if (!fs.existsSync(BADGE_NFT.sierra)) {
    console.error(`Missing: ${BADGE_NFT.sierra}`);
    console.error("Run: cd contracts && scarb build");
    process.exit(1);
  }

  const baseUri = process.env.BASE_URI || "https://zkcred.xyz/api/nft/metadata";

  console.log("Registry:", registryAddress);
  console.log("Owner:   ", accountAddress);
  console.log("Base URI:", baseUri);

  // Setup
  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account({ provider, address: accountAddress, signer: privateKey });

  try {
    const nonce = await provider.getNonceForAddress(accountAddress);
    console.log("Account nonce:", nonce);
  } catch (e) {
    console.error("\nError: Account not found or not funded.");
    console.error("Get testnet STRK from: https://starknet-faucet.vercel.app/");
    process.exit(1);
  }

  const sierra = JSON.parse(fs.readFileSync(BADGE_NFT.sierra, "utf8"));
  const casm = JSON.parse(fs.readFileSync(BADGE_NFT.casm, "utf8"));

  // Declare
  console.log("\nDeclaring BadgeNFT...");
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

  // Build constructor calldata
  // ByteArray in Starknet.js is serialized via byteArray.byteArrayFromString
  const constructorCalldata = CallData.compile({
    owner: accountAddress,
    registry_address: registryAddress,
    base_uri: byteArray.byteArrayFromString(baseUri),
  });

  // Deploy
  console.log("Deploying BadgeNFT...");
  const deployResult = await account.deployContract({
    classHash,
    constructorCalldata,
    salt: stark.randomAddress(),
  });

  await provider.waitForTransaction(deployResult.transaction_hash);
  const badgeAddress = deployResult.contract_address;

  console.log("\n=== BadgeNFT Deployed ===");
  console.log("Address:", badgeAddress);
  console.log("Tx:     ", deployResult.transaction_hash);
  console.log("\n--- Add to frontend/.env.local ---");
  console.log(`BADGE_NFT_ADDRESS=${badgeAddress}`);
  console.log(`NEXT_PUBLIC_BADGE_NFT_ADDRESS=${badgeAddress}`);
  console.log("\n--- View on explorer ---");
  console.log(`https://sepolia.voyager.online/contract/${badgeAddress}`);
}

main().catch((e) => {
  console.error("Deployment failed:", e);
  process.exit(1);
});

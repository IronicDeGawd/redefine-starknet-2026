/**
 * Check deployer account balance on Starknet Sepolia
 * Usage: node scripts/check_balance.js
 */

const RPC_URL = "https://rpc.starknet-testnet.lava.build/rpc/v0_8";
const ACCOUNT = process.env.STARKNET_ACCOUNT_ADDRESS || "0x07fc0b2781635bb9d2f71816433e674837e46c9aa451056e193c1e02aa9daa69";

// Token contracts on Starknet Sepolia
const TOKENS = {
    ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
};

// balanceOf selector = sn_keccak("balanceOf")
const BALANCE_OF_SELECTOR = "0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e";

async function getBalance(tokenAddress) {
    const res = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "starknet_call",
            params: [
                {
                    contract_address: tokenAddress,
                    entry_point_selector: BALANCE_OF_SELECTOR,
                    calldata: [ACCOUNT],
                },
                "latest",
            ],
            id: 1,
        }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    // Result is [low, high] u256 — combine them
    const low = BigInt(data.result[0]);
    const high = BigInt(data.result[1]);
    const balance = (high << 128n) + low;

    return balance;
}

function formatBalance(wei) {
    const whole = wei / 10n ** 18n;
    const frac = wei % 10n ** 18n;
    const fracStr = frac.toString().padStart(18, "0").slice(0, 6); // 6 decimals
    return `${whole}.${fracStr}`;
}

async function main() {
    console.log("=== Starknet Sepolia Balance Check ===\n");
    console.log("Account:", ACCOUNT);
    console.log("────────────────────────────────────────");

    for (const [symbol, address] of Object.entries(TOKENS)) {
        const balanceWei = await getBalance(address);
        const formatted = formatBalance(balanceWei);
        console.log(`${symbol.padEnd(5)} ${formatted} (${balanceWei.toString()} wei)`);
    }

    console.log("────────────────────────────────────────");
}

main().catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
});

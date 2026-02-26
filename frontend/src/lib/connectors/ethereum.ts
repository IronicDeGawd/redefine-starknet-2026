/**
 * Ethereum Connector — Queries ETH balance via public RPC
 * Determines holder tier based on ETH balance
 */

export interface EthProfile {
  address: string;
  balanceWei: string;
  balanceEth: number;
}

export interface EthTierResult {
  success: boolean;
  tier: number;
  tierName: string;
  profile?: EthProfile;
  verificationProof: {
    oracleProvider: string;
    queryTimestamp: number;
    dataHash: string;
  };
  error?: string;
}

const TIER_NAMES: Record<number, string> = {
  0: "Dust",
  1: "Holder",
  2: "Stacker",
  3: "Whale",
};

const TIER_EMOJIS: Record<number, string> = {
  0: "🫧",
  1: "💎",
  2: "🔷",
  3: "🐋",
};

// ETH tier boundaries (in ETH)
const TIER_BOUNDARIES = {
  HOLDER: 0.1,   // 0.1 ETH
  STACKER: 1,    // 1 ETH
  WHALE: 10,     // 10 ETH
};

/**
 * Calculate holder tier from ETH balance
 * Tier 0: <0.1 ETH (Dust)
 * Tier 1: 0.1-1 ETH (Holder)
 * Tier 2: 1-10 ETH (Stacker)
 * Tier 3: 10+ ETH (Whale)
 */
export function calculateTier(balanceEth: number): number {
  if (balanceEth >= TIER_BOUNDARIES.WHALE) return 3;
  if (balanceEth >= TIER_BOUNDARIES.STACKER) return 2;
  if (balanceEth >= TIER_BOUNDARIES.HOLDER) return 1;
  return 0;
}

/**
 * Get ETH balance for an address via public RPC
 * Uses multiple fallback providers for reliability
 */
export async function getBalance(address: string, network: "mainnet" | "sepolia" = "mainnet"): Promise<EthProfile> {
  // Validate ETH address format
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error("Invalid Ethereum address format");
  }

  // Public RPC endpoints (no API key needed for basic balance queries)
  const rpcUrls: Record<string, string[]> = {
    mainnet: [
      "https://eth.llamarpc.com",
      "https://rpc.ankr.com/eth",
      "https://ethereum-rpc.publicnode.com",
    ],
    sepolia: [
      "https://rpc.ankr.com/eth_sepolia",
      "https://ethereum-sepolia-rpc.publicnode.com",
    ],
  };

  const urls = rpcUrls[network] || rpcUrls.mainnet;
  let lastError: string = "";

  for (const rpcUrl of urls) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBalance",
          params: [address, "latest"],
          id: 1,
        }),
      });

      if (!response.ok) {
        lastError = `RPC error: ${response.status}`;
        continue;
      }

      const data = await response.json();

      if (data.error) {
        lastError = data.error.message;
        continue;
      }

      const balanceWei = data.result as string;
      // [2.1 FIX] Use BigInt — parseInt overflows for balances > ~2.1 ETH
      const balanceEth = Number(BigInt(balanceWei)) / 1e18;

      return {
        address,
        balanceWei,
        balanceEth,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";
      continue;
    }
  }

  throw new Error(`Failed to query ETH balance: ${lastError}`);
}

/**
 * Full verification flow: get balance → calculate tier → generate proof
 */
export async function verifyEthBalance(
  address: string,
  network: "mainnet" | "sepolia" = "mainnet"
): Promise<EthTierResult> {
  try {
    const profile = await getBalance(address, network);
    const tier = calculateTier(profile.balanceEth);
    const queryTimestamp = Date.now();

    // Hash the verification data
    const dataString = `${address}:${profile.balanceWei}:${queryTimestamp}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(dataString));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const dataHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return {
      success: true,
      tier,
      tierName: TIER_NAMES[tier],
      profile,
      verificationProof: {
        oracleProvider: "ethereum_rpc",
        queryTimestamp,
        dataHash,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      tier: 0,
      tierName: "Unknown",
      verificationProof: {
        oracleProvider: "ethereum_rpc",
        queryTimestamp: Date.now(),
        dataHash: "",
      },
      error: message,
    };
  }
}

export { TIER_NAMES, TIER_EMOJIS };

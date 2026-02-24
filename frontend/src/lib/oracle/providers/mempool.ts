/**
 * Mempool.space Oracle Provider
 * Free API for Bitcoin address balance and transaction data
 * Docs: https://mempool.space/docs/api/rest
 */

import type {
  OracleProvider,
  BalanceResponse,
  AddressInfo,
  Transaction,
  WalletAgeInfo,
} from "../types";
import { getTierFromAge } from "../types";

const MAINNET_API = "https://mempool.space/api";
const TESTNET_API = "https://mempool.space/testnet/api";

// Satoshis per BTC
const SATS_PER_BTC = 100_000_000;

export class MempoolProvider implements OracleProvider {
  public readonly name = "mempool.space";
  private readonly baseUrl: string;

  constructor(network: "mainnet" | "testnet" = "mainnet") {
    this.baseUrl = network === "mainnet" ? MAINNET_API : TESTNET_API;
  }

  /**
   * Get balance for a Bitcoin address
   */
  async getBalance(address: string): Promise<BalanceResponse> {
    const info = await this.getAddressInfo(address);

    const confirmedBalance =
      info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum;
    const unconfirmedBalance =
      info.mempool_stats.funded_txo_sum - info.mempool_stats.spent_txo_sum;
    const totalBalance = confirmedBalance + unconfirmedBalance;

    return {
      address,
      confirmedBalance,
      unconfirmedBalance,
      totalBalance,
      btcBalance: totalBalance / SATS_PER_BTC,
    };
  }

  /**
   * Get detailed address info from mempool.space
   */
  async getAddressInfo(address: string): Promise<AddressInfo> {
    const response = await fetch(`${this.baseUrl}/address/${address}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limited by mempool.space. Please try again later.");
      }
      throw new Error(`Failed to fetch address info: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get transactions for an address (confirmed only, paginated)
   */
  async getAddressTransactions(
    address: string,
    lastSeenTxid?: string
  ): Promise<Transaction[]> {
    let url = `${this.baseUrl}/address/${address}/txs/chain`;
    if (lastSeenTxid) {
      url += `/${lastSeenTxid}`;
    }

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limited by mempool.space. Please try again later.");
      }
      throw new Error(`Failed to fetch transactions: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get the first (oldest) transaction for an address
   * Paginates through all transactions to find the earliest one
   */
  async getFirstTransaction(address: string): Promise<Transaction | null> {
    let lastSeenTxid: string | undefined;
    let oldestTx: Transaction | null = null;
    let pageCount = 0;
    const maxPages = 100; // Safety limit

    while (pageCount < maxPages) {
      const transactions = await this.getAddressTransactions(address, lastSeenTxid);

      if (transactions.length === 0) {
        break;
      }

      // The last transaction in the response is the oldest in this batch
      const batchOldest = transactions[transactions.length - 1];

      // Check if it's confirmed and older than our current oldest
      if (batchOldest.status.confirmed) {
        if (
          !oldestTx ||
          (batchOldest.status.block_time &&
            oldestTx.status.block_time &&
            batchOldest.status.block_time < oldestTx.status.block_time)
        ) {
          oldestTx = batchOldest;
        }
      }

      // If we got fewer than 25, we've reached the end
      if (transactions.length < 25) {
        break;
      }

      // Set up pagination for next request
      lastSeenTxid = batchOldest.txid;
      pageCount++;

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return oldestTx;
  }

  /**
   * Get wallet age information
   */
  async getWalletAge(address: string): Promise<WalletAgeInfo> {
    const firstTx = await this.getFirstTransaction(address);

    if (!firstTx || !firstTx.status.block_time) {
      return {
        address,
        firstTxTimestamp: null,
        firstTxHash: null,
        ageInDays: 0,
        ageTier: 0,
      };
    }

    const firstTxTimestamp = firstTx.status.block_time;
    const now = Math.floor(Date.now() / 1000);
    const ageInSeconds = now - firstTxTimestamp;
    const ageInDays = Math.floor(ageInSeconds / (60 * 60 * 24));

    const { tier: ageTier } = getTierFromAge(ageInDays);

    return {
      address,
      firstTxTimestamp,
      firstTxHash: firstTx.txid,
      ageInDays,
      ageTier,
    };
  }
}

// Default instance for mainnet
export const mempoolProvider = new MempoolProvider("mainnet");

// Testnet instance
export const mempoolTestnetProvider = new MempoolProvider("testnet");

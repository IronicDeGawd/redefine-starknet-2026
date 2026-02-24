"use client";

import { useCallback } from "react";
import { useAppStore } from "@/stores/useAppStore";

// Types for sats-connect (simplified for browser compatibility)
interface WalletAccount {
  address: string;
  publicKey: string;
  purpose: string;
}

interface GetAccountsResponse {
  status: "success" | "error";
  result?: WalletAccount[];
  error?: { message: string };
}

interface SignMessageResponse {
  status: "success" | "error";
  result?: { signature: string };
  error?: { message: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Wallet: any = null;

if (typeof window !== "undefined") {
  import("sats-connect").then((module) => {
    Wallet = module.default || module;
  });
}

export function useBtcWallet() {
  const { btcWallet, setBtcWallet, disconnectBtcWallet } = useAppStore();

  const connect = useCallback(async () => {
    if (!Wallet) {
      // Fallback for demo/testing
      console.warn("sats-connect not available, using mock wallet");
      setBtcWallet({
        status: "connected",
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        pubkey: "02" + "a".repeat(64),
      });
      return {
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        pubkey: "02" + "a".repeat(64),
      };
    }

    setBtcWallet({ status: "connecting" });

    try {
      const response: GetAccountsResponse = await Wallet.request("getAccounts", {
        purposes: ["payment"],
        message: "Connect to ZKCred to create privacy credentials",
      });

      if (response.status === "success" && response.result?.length) {
        const account = response.result.find((a) => a.purpose === "payment") || response.result[0];

        setBtcWallet({
          status: "connected",
          address: account.address,
          pubkey: account.publicKey,
        });

        return {
          address: account.address,
          pubkey: account.publicKey,
        };
      } else {
        throw new Error(response.error?.message || "Connection failed");
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      setBtcWallet({ status: "disconnected" });
      throw error;
    }
  }, [setBtcWallet]);

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!btcWallet.address) {
        throw new Error("Wallet not connected");
      }

      if (!Wallet) {
        // Mock signature for demo
        console.warn("Using mock signature");
        return "mock_signature_" + Date.now();
      }

      try {
        const response: SignMessageResponse = await Wallet.request("signMessage", {
          address: btcWallet.address,
          message,
          protocol: "BIP322",
        });

        if (response.status === "success" && response.result?.signature) {
          return response.result.signature;
        } else {
          throw new Error(response.error?.message || "Signing failed");
        }
      } catch (error) {
        console.error("Signing error:", error);
        throw error;
      }
    },
    [btcWallet.address]
  );

  const disconnect = useCallback(() => {
    disconnectBtcWallet();
  }, [disconnectBtcWallet]);

  return {
    ...btcWallet,
    isConnected: btcWallet.status === "connected",
    isConnecting: btcWallet.status === "connecting",
    connect,
    signMessage,
    disconnect,
  };
}

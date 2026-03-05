"use client";

import { useCallback } from "react";
import { useAppStore } from "@/stores/useAppStore";

export function useEthWallet() {
  const { ethWallet, setEthWallet, disconnectEthWallet } = useAppStore();

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    setEthWallet({ status: "connecting" });

    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts?.length) {
        throw new Error("No accounts returned");
      }

      const address = accounts[0];
      setEthWallet({ status: "connected", address });
      return { address };
    } catch (error) {
      console.error("ETH wallet connection error:", error);
      setEthWallet({ status: "disconnected" });
      throw error;
    }
  }, [setEthWallet]);

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!ethWallet.address) {
        throw new Error("Wallet not connected");
      }

      if (typeof window === "undefined" || !window.ethereum) {
        // Mock signature for demo/testing
        console.warn("Using mock ETH signature");
        return "mock_eth_sig_" + Date.now();
      }

      try {
        const signature = (await window.ethereum.request({
          method: "personal_sign",
          params: [message, ethWallet.address],
        })) as string;

        return signature;
      } catch (error) {
        console.error("ETH signing error:", error);
        throw error;
      }
    },
    [ethWallet.address]
  );

  const disconnect = useCallback(() => {
    disconnectEthWallet();
  }, [disconnectEthWallet]);

  return {
    ...ethWallet,
    isConnected: ethWallet.status === "connected",
    isConnecting: ethWallet.status === "connecting",
    connect,
    signMessage,
    disconnect,
  };
}

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Tier, CredentialType, Credential } from "@/types/credential";
import type { ChatMessage, ToolUse } from "@/types/api";

// ============================================
// Types
// ============================================

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolUse?: ToolUse;
  toolResult?: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
  credentialId?: string;
}

export interface BtcWalletState {
  status: "disconnected" | "connecting" | "connected";
  address: string | null;
  pubkey: string | null;
}

export interface EthWalletState {
  status: "disconnected" | "connecting" | "connected";
  address: string | null;
}

export interface PendingCredential {
  type: CredentialType;
  tier: Tier;
  message: string;
}

// ============================================
// Store
// ============================================

interface AppState {
  // Chat
  messages: Message[];
  isAgentThinking: boolean;
  pendingToolUse: ToolUse | null;
  sessionId: string;

  // Wallets
  btcWallet: BtcWalletState;
  ethWallet: EthWalletState;

  // Credentials
  credentials: Credential[];
  pendingCredential: PendingCredential | null;

  // Actions - Chat
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setAgentThinking: (thinking: boolean) => void;
  setPendingToolUse: (toolUse: ToolUse | null) => void;
  clearMessages: () => void;

  // Actions - Wallet
  setBtcWallet: (wallet: Partial<BtcWalletState>) => void;
  disconnectBtcWallet: () => void;
  setEthWallet: (wallet: Partial<EthWalletState>) => void;
  disconnectEthWallet: () => void;

  // Actions - Credentials
  addCredential: (credential: Credential) => void;
  removeCredential: (id: string) => void;
  updateCredential: (id: string, updates: Partial<Credential>) => void;
  setPendingCredential: (pending: PendingCredential | null) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State - Chat
      messages: [],
      isAgentThinking: false,
      pendingToolUse: null,
      sessionId: generateId(),

      // Initial State - Wallet
      btcWallet: {
        status: "disconnected",
        address: null,
        pubkey: null,
      },
      ethWallet: {
        status: "disconnected",
        address: null,
      },

      // Initial State - Credentials
      credentials: [],
      pendingCredential: null,

      // Actions - Chat
      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: generateId(),
              timestamp: new Date(),
            },
          ],
        })),

      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        })),

      setAgentThinking: (thinking) =>
        set({ isAgentThinking: thinking }),

      setPendingToolUse: (toolUse) =>
        set({ pendingToolUse: toolUse }),

      clearMessages: () =>
        set({
          messages: [],
          sessionId: generateId(),
        }),

      // Actions - Wallet
      setBtcWallet: (wallet) =>
        set((state) => ({
          btcWallet: { ...state.btcWallet, ...wallet },
        })),

      disconnectBtcWallet: () =>
        set({
          btcWallet: {
            status: "disconnected",
            address: null,
            pubkey: null,
          },
        }),

      setEthWallet: (wallet) =>
        set((state) => ({
          ethWallet: { ...state.ethWallet, ...wallet },
        })),

      disconnectEthWallet: () =>
        set({
          ethWallet: {
            status: "disconnected",
            address: null,
          },
        }),

      // Actions - Credentials
      addCredential: (credential) =>
        set((state) => ({
          credentials: [credential, ...state.credentials],
        })),

      removeCredential: (id) =>
        set((state) => ({
          credentials: state.credentials.filter((c) => c.id !== id),
        })),

      updateCredential: (id, updates) =>
        set((state) => ({
          credentials: state.credentials.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      setPendingCredential: (pending) =>
        set({ pendingCredential: pending }),
    }),
    {
      name: "zkcred-storage",
      partialize: (state) => ({
        credentials: state.credentials,
        btcWallet: state.btcWallet.status === "connected" ? state.btcWallet : {
          status: "disconnected" as const,
          address: null,
          pubkey: null,
        },
        ethWallet: state.ethWallet.status === "connected" ? state.ethWallet : {
          status: "disconnected" as const,
          address: null,
        },
      }),
    }
  )
);

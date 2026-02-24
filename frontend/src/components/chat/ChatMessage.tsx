"use client";

import { cn } from "@/lib/cn";
import type { Message } from "@/stores/useAppStore";
import { ToolAction } from "./ToolAction";
import { TIER_EMOJIS, type Tier, type CredentialType } from "@/types/credential";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: Message;
  onToolAction?: (toolId: string, action: string, data?: unknown) => void;
}

export function ChatMessage({ message, onToolAction }: ChatMessageProps) {
  const isUser = message.role === "user";
  const showToolAction = Boolean(message.toolUse && !message.toolResult);
  const hasCredential = Boolean(message.credentialId && message.toolResult?.success);
  const hasError = Boolean(message.toolResult && !message.toolResult.success);

  const handleToolAction = (action: string, data?: unknown) => {
    if (message.toolUse && onToolAction) {
      onToolAction(message.toolUse.id, action, data);
    }
  };

  return (
    <div
      className={cn(
        "flex gap-3 animate-slide-up",
        isUser ? "flex-row-reverse" : ""
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
          isUser
            ? "bg-gradient-to-br from-cyan-500 to-blue-600"
            : "bg-gradient-to-br from-[var(--accent-primary)] to-violet-600"
        )}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      <div
        className={cn(
          "flex flex-col gap-2 max-w-[85%] md:max-w-[70%]",
          isUser ? "items-end" : ""
        )}
      >
        <div
          className={cn(
            "px-4 py-3 rounded-2xl",
            isUser
              ? "bg-[var(--accent-primary)] text-white rounded-br-md"
              : "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-bl-md"
          )}
        >
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>

        {showToolAction && message.toolUse ? (
          <ToolAction
            toolUse={message.toolUse}
            onAction={handleToolAction}
          />
        ) : null}

        {hasCredential && message.toolResult?.data ? (
          <div className="mt-2">
            <CredentialSuccess data={message.toolResult.data as CredentialSuccessData} />
          </div>
        ) : null}

        {hasError ? (
          <div className="px-4 py-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl">
            <p className="text-sm text-[var(--error)]">
              {message.toolResult?.error ?? "Action failed. Please try again."}
            </p>
          </div>
        ) : null}

        <span className="text-xs text-[var(--text-muted)] px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

interface CredentialSuccessData {
  credentialId: string;
  tier: Tier;
  type: CredentialType;
  transactionHash?: string;
}

function CredentialSuccess({ data }: { data: CredentialSuccessData }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[var(--success)]">
        <div className="w-5 h-5 rounded-full bg-[var(--success)] flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-sm font-medium">Credential Issued!</span>
      </div>

      <div className="p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-default)]">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{TIER_EMOJIS[data.tier]}</span>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">
              {getTierName(data.tier)} Tier
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              {data.type === "btc_tier" ? "BTC Holdings" : "Wallet Age"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Credential ID</span>
            <code className="font-mono text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded">
              {truncateId(data.credentialId)}
            </code>
          </div>
          {data.transactionHash ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Transaction</span>
              <a
                href={`https://sepolia.starkscan.co/tx/${data.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[var(--accent-secondary)] hover:underline"
              >
                {truncateId(data.transactionHash)}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getTierName(tier: Tier): string {
  const names: Record<Tier, string> = {
    0: "Shrimp",
    1: "Crab",
    2: "Fish",
    3: "Whale",
  };
  return names[tier];
}

function truncateId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}...${id.slice(-6)}`;
}

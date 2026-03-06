"use client";

import { cn } from "@/lib/cn";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/stores/useAppStore";
import { ToolAction } from "./ToolAction";
import { TierIcon } from "@/components/credential/TierBadge";
import { TIER_NAMES, type Tier, type CredentialType } from "@/types/credential";
import { CREDENTIAL_CONFIG } from "@/lib/badges/config";
import { Bot, User, CheckCircle2, ExternalLink } from "lucide-react";

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
        "flex gap-3 animate-fade-in",
        isUser ? "flex-row-reverse" : ""
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
          isUser
            ? "bg-[var(--primary)]"
            : "bg-white border border-[var(--border)]"
        )}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-[var(--primary)]" />
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
            "px-4 py-3 rounded-2xl shadow-sm",
            isUser
              ? "bg-[var(--primary)] text-white rounded-br-md"
              : "bg-white text-[var(--text-primary)] border border-[var(--border-light)] rounded-bl-md"
          )}
        >
          {isUser ? (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <div className="text-[15px] leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-[var(--text-primary)] prose-headings:text-[var(--text-primary)] prose-table:my-2 prose-th:px-3 prose-th:py-1.5 prose-th:text-left prose-th:text-xs prose-th:font-semibold prose-th:bg-[var(--grey-100)] prose-td:px-3 prose-td:py-1.5 prose-td:text-sm prose-td:border-t prose-td:border-[var(--border-light)]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
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
          <div className="px-4 py-3 bg-[var(--error-light)] border border-[var(--error)]/20 rounded-xl">
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
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-semibold">Credential Issued!</span>
      </div>

      <div className="p-5 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <TierIcon tier={data.tier} size="lg" />
          <div>
            <p className="font-semibold text-[var(--text-primary)] text-lg">
              {TIER_NAMES[data.tier]} Tier
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              {CREDENTIAL_CONFIG[data.type]?.label ?? data.type} Credential
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[var(--border-light)]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Credential ID</span>
            <code className="font-mono text-[var(--text-secondary)] bg-[var(--grey-100)] px-2 py-1 rounded-lg text-xs">
              {truncateId(data.credentialId)}
            </code>
          </div>
          {data.transactionHash ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Transaction</span>
              <a
                href={`https://sepolia.voyager.online/tx/${data.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[var(--primary)] hover:underline text-xs"
              >
                {truncateId(data.transactionHash)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function truncateId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}...${id.slice(-6)}`;
}

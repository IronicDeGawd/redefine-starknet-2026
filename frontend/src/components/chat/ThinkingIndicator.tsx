"use client";

import { Bot } from "lucide-react";

export function ThinkingIndicator() {
  return (
    <div className="flex gap-3 animate-slide-up">
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-violet-600 flex items-center justify-center">
        <Bot className="w-5 h-5 text-white" />
      </div>

      {/* Thinking bubble */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-2xl rounded-bl-md">
        <div className="thinking-dots flex gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
        </div>
        <span className="text-sm text-[var(--text-muted)] ml-1">Thinking</span>
      </div>
    </div>
  );
}

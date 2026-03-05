"use client";

import { useState, useMemo, useRef, useEffect, type KeyboardEvent, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { Send, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  { text: "I want to prove my Bitcoin holdings", triggers: ["btc", "bitcoin", "prove", "holding"] },
  { text: "I want to prove my Ethereum holdings", triggers: ["eth", "ethereum", "wallet", "ether"] },
  { text: "Create a GitHub developer credential", triggers: ["github", "dev", "developer", "code", "repo"] },
  { text: "Verify my Codeforces rating", triggers: ["codeforces", "competitive", "rating", "cp"] },
  { text: "Prove my Strava fitness activity", triggers: ["strava", "fitness", "run", "exercise", "athlete"] },
  { text: "Verify my Steam gaming profile", triggers: ["steam", "game", "gaming"] },
  { text: "How does ZKCred work?", triggers: ["how", "what", "explain", "help", "work"] },
  { text: "Show me my credentials", triggers: ["show", "list", "credential", "my"] },
  { text: "What is a zero-knowledge proof?", triggers: ["zk", "zero", "knowledge", "proof", "privacy"] },
];

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Ask ZKCred anything...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const matchedSuggestions = useMemo(() => {
    const input = message.trim().toLowerCase();
    if (input.length < 2) return [];
    const words = input.split(/\s+/);
    return SUGGESTIONS.filter((s) =>
      s.triggers.some((trigger) =>
        words.some((word) => word.length >= 3 && trigger.startsWith(word))
      )
    ).slice(0, 3);
  }, [message]);

  const handleSuggestionClick = (text: string) => {
    onSend(text);
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* Suggestion chips */}
      {matchedSuggestions.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-2 mb-2 animate-fade-in">
          {matchedSuggestions.map((s) => (
            <button
              key={s.text}
              type="button"
              onClick={() => handleSuggestionClick(s.text)}
              className="px-3 py-1.5 text-xs font-medium text-[var(--primary)] bg-[var(--primary-light)] hover:bg-[var(--primary)]/15 rounded-full transition-colors border border-[var(--primary)]/20"
            >
              {s.text}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "relative flex items-end gap-2 p-2",
          "bg-white border border-[var(--border)]",
          "rounded-2xl shadow-sm",
          "transition-all duration-200",
          "focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary-light)]",
          disabled && "opacity-60"
        )}
      >
        {/* Sparkles icon */}
        <div className="flex items-center justify-center w-10 h-10 text-[var(--text-muted)]">
          <Sparkles className="w-5 h-5" />
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none",
            "bg-transparent border-0",
            "text-[var(--text-primary)] text-[15px] leading-relaxed",
            "placeholder:text-[var(--text-muted)]",
            "focus:outline-none",
            "max-h-[150px]",
            "py-2.5"
          )}
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className={cn(
            "flex items-center justify-center",
            "w-10 h-10 rounded-xl",
            "transition-all duration-200",
            message.trim() && !disabled
              ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm"
              : "bg-[var(--grey-100)] text-[var(--text-muted)] cursor-not-allowed"
          )}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Hint */}
      <p className="text-center text-xs text-[var(--text-muted)] mt-2">
        Press <kbd className="px-1.5 py-0.5 bg-[var(--grey-100)] rounded text-[var(--text-secondary)] font-mono text-[10px]">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-[var(--grey-100)] rounded text-[var(--text-secondary)] font-mono text-[10px]">Shift+Enter</kbd> for new line
      </p>
    </form>
  );
}

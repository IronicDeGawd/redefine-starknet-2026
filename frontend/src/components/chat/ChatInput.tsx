"use client";

import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { Send, Sparkles } from "lucide-react";

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

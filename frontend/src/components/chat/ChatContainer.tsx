"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { WelcomeScreen } from "./WelcomeScreen";

export function ChatContainer() {
  const { messages, isAgentThinking, sendMessage, submitToolResult } = useChat();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  // Scroll so the newest message is visible near the top of the viewport
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      const area = scrollAreaRef.current;
      if (area) {
        // Find the last message element and scroll it into view at the start
        const messageElements = area.querySelectorAll("[data-chat-message]");
        const lastEl = messageElements[messageElements.length - 1];
        if (lastEl) {
          lastEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length]);

  const handleToolAction = async (toolId: string, action: string, data?: unknown) => {
    await submitToolResult(toolId, data, true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        {messages.length === 0 ? (
          <WelcomeScreen onQuickAction={sendMessage} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div key={message.id} data-chat-message>
                <ChatMessage
                  message={message}
                  onToolAction={handleToolAction}
                />
              </div>
            ))}

            {isAgentThinking && <ThinkingIndicator />}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 backdrop-blur-xl p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={sendMessage}
            disabled={isAgentThinking}
            placeholder={
              isAgentThinking
                ? "ZKCred is thinking..."
                : "Ask me to create a credential..."
            }
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { WelcomeScreen } from "./WelcomeScreen";

export function ChatContainer() {
  const { messages, isAgentThinking, sendMessage, submitToolResult } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAgentThinking]);

  const handleToolAction = async (toolId: string, action: string, data?: unknown) => {
    await submitToolResult(toolId, data, true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        {messages.length === 0 ? (
          <WelcomeScreen onQuickAction={sendMessage} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onToolAction={handleToolAction}
              />
            ))}

            {isAgentThinking && <ThinkingIndicator />}

            <div ref={messagesEndRef} />
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

"use client";

import { useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import { useAppStore } from "@/stores/useAppStore";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { WelcomeScreen } from "./WelcomeScreen";

const OAUTH_SUCCESS_PARAMS: Record<string, string> = {
  github_success: "GitHub authentication successful",
  codeforces_success: "Codeforces authentication successful",
  steam_success: "Steam authentication successful",
  strava_success: "Strava authentication successful",
};

export function ChatContainer() {
  const { messages, isAgentThinking, sendMessage, submitToolResult } = useChat();
  const pendingToolUse = useAppStore((s) => s.pendingToolUse);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  const oauthHandledRef = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Resume conversation after OAuth redirect back to /chat
  useEffect(() => {
    if (oauthHandledRef.current) return;

    const errorParam = searchParams.get("error");
    if (errorParam) {
      oauthHandledRef.current = true;
      router.replace("/chat");
      if (pendingToolUse) {
        submitToolResult(pendingToolUse.id, { success: false, error: decodeURIComponent(errorParam) }, false);
      }
      return;
    }

    for (const [param, successMessage] of Object.entries(OAUTH_SUCCESS_PARAMS)) {
      if (searchParams.get(param) === "true") {
        oauthHandledRef.current = true;
        router.replace("/chat");
        if (pendingToolUse) {
          submitToolResult(pendingToolUse.id, { success: true, message: successMessage }, true);
        }
        return;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll so the newest message is visible near the top of the viewport
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      const area = scrollAreaRef.current;
      if (area) {
        const messageElements = area.querySelectorAll("[data-chat-message]");
        const lastEl = messageElements[messageElements.length - 1];
        if (lastEl) {
          lastEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length]);

  const handleToolAction = async (toolId: string, _action: string, data?: unknown) => {
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

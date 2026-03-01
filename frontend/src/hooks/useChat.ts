"use client";

import { useCallback } from "react";
import { useAppStore } from "@/stores/useAppStore";
import type { ChatMessage, ChatResponse, ToolResult } from "@/types/api";

export function useChat() {
  const {
    messages,
    isAgentThinking,
    pendingToolUse,
    sessionId,
    addMessage,
    updateMessage,
    setAgentThinking,
    setPendingToolUse,
  } = useAppStore();

  const sendMessage = useCallback(
    async (content: string, toolResults?: ToolResult[]) => {
      // Add user message (only if not a tool result)
      if (!toolResults) {
        addMessage({
          role: "user",
          content,
        });
      }

      setAgentThinking(true);
      setPendingToolUse(null);

      try {
        // Build messages array for API
        const apiMessages: ChatMessage[] = messages
          .filter((m) => !m.toolUse) // Exclude tool use messages from history
          .map((m) => ({
            role: m.role,
            content: m.content,
          }));

        // Add the new user message
        if (!toolResults) {
          apiMessages.push({ role: "user", content });
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Id": sessionId,
          },
          body: JSON.stringify({
            messages: apiMessages,
            toolResults,
            sessionId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        const data: ChatResponse = await response.json();

        if (data.type === "text" && data.content) {
          addMessage({
            role: "assistant",
            content: data.content,
          });
        } else if (data.type === "tool_use" && data.toolUse) {
          // Add assistant message with tool use
          addMessage({
            role: "assistant",
            content: `I'll help you with that. Let me ${getToolDescription(data.toolUse.name)}...`,
            toolUse: data.toolUse,
          });
          setPendingToolUse(data.toolUse);
        }
      } catch (error) {
        console.error("Chat error:", error);
        addMessage({
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        });
      } finally {
        setAgentThinking(false);
      }
    },
    [messages, sessionId, addMessage, setAgentThinking, setPendingToolUse]
  );

  const submitToolResult = useCallback(
    async (toolUseId: string, result: unknown, success: boolean = true) => {
      // Update the message with tool result
      const messageWithTool = messages.find((m) => m.toolUse?.id === toolUseId);
      if (messageWithTool) {
        updateMessage(messageWithTool.id, {
          toolResult: { success, data: result },
        });
      }

      // Send tool result to continue conversation
      await sendMessage("", [
        {
          toolUseId,
          result,
        },
      ]);
    },
    [messages, updateMessage, sendMessage]
  );

  return {
    messages,
    isAgentThinking,
    pendingToolUse,
    sendMessage,
    submitToolResult,
  };
}

function getToolDescription(toolName: string): string {
  const descriptions: Record<string, string> = {
    connect_btc_wallet: "connect your Bitcoin wallet",
    sign_credential_request: "request your signature",
    issue_credential: "issue your credential on Starknet",
    verify_credential: "verify the credential",
  };
  return descriptions[toolName] || "process your request";
}

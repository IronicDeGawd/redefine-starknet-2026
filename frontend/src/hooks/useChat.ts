"use client";

import { useCallback, useRef } from "react";
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

  // Use ref for latest messages to avoid stale closure in submitToolResult
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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
        // Build messages array for API — include tool interactions
        const currentMessages = messagesRef.current;
        const apiMessages: ChatMessage[] = [];

        for (const m of currentMessages) {
          if (m.toolUse) {
            // Assistant message that contains a tool call
            apiMessages.push({
              role: "assistant",
              content: m.content,
              toolUse: m.toolUse,
            });
            // If this tool has a result, add the tool result as a user message
            if (m.toolResult) {
              apiMessages.push({
                role: "user",
                content: "",
                toolResult: {
                  toolUseId: m.toolUse.id,
                  result: m.toolResult.data,
                },
              });
            }
          } else {
            apiMessages.push({
              role: m.role,
              content: m.content,
            });
          }
        }

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
          addMessage({
            role: "assistant",
            content: data.content || `Let me ${getToolDescription(data.toolUse.name)}...`,
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
    [sessionId, addMessage, setAgentThinking, setPendingToolUse]
  );

  const submitToolResult = useCallback(
    async (toolUseId: string, result: unknown, success: boolean = true) => {
      // Update the message with tool result
      const currentMessages = messagesRef.current;
      const messageWithTool = currentMessages.find((m) => m.toolUse?.id === toolUseId);
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
    [updateMessage, sendMessage]
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
    connect_eth_wallet: "connect your Ethereum wallet",
    start_oauth: "authenticate your account",
    request_signature: "request your signature",
    sign_credential_request: "request your signature",
    issue_credential: "issue your credential on Starknet",
    verify_credential: "verify the credential",
    connect_starknet_wallet: "connect your Starknet wallet",
    mint_badge_nft: "mint your badge NFT",
  };
  return descriptions[toolName] || "process your request";
}

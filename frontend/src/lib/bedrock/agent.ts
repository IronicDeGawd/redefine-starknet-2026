/**
 * AI Agent logic for ZKCred
 */

import { invokeModel, MODEL_ID } from "./client";
import { SYSTEM_PROMPT, buildToolConfig } from "./tools";
import type { ToolResultInput, AgentResponse } from "@/types/agent";
import type { ChatMessage } from "@/types/api";
import type {
  ContentBlock,
  Message as BedrockMessage,
} from "@aws-sdk/client-bedrock-runtime";

/**
 * Invoke the AI agent with conversation messages
 */
export async function invokeAgent(
  messages: ChatMessage[],
  toolResults?: ToolResultInput[]
): Promise<AgentResponse> {
  // Build conversation messages for Bedrock
  const conversationMessages = buildMessages(messages, toolResults);

  // Build tool config
  const toolConfig = buildToolConfig();

  // Call Bedrock
  const response = await invokeModel({
    modelId: MODEL_ID,
    system: [{ text: SYSTEM_PROMPT }],
    messages: conversationMessages,
    toolConfig: toolConfig as unknown as Parameters<typeof invokeModel>[0]["toolConfig"],
    inferenceConfig: {
      maxTokens: 1024,
      temperature: 0.7,
    },
  });

  // Parse and return response
  return parseAgentResponse(response);
}

/**
 * Build Bedrock message format from our messages.
 *
 * Bedrock Converse API requires strict alternating user/assistant messages.
 * Tool interactions must follow this pattern:
 *   assistant: { toolUse: { ... } }
 *   user:      { toolResult: { ... } }
 */
function buildMessages(
  messages: ChatMessage[],
  toolResults?: ToolResultInput[]
): BedrockMessage[] {
  const formatted: BedrockMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "assistant" && msg.toolUse) {
      // Assistant message with a tool call — include both text and toolUse blocks
      const content: ContentBlock[] = [];
      if (msg.content) {
        content.push({ text: msg.content });
      }
      content.push({
        toolUse: {
          toolUseId: msg.toolUse.id,
          name: msg.toolUse.name,
          input: msg.toolUse.input || {},
        },
      } as ContentBlock);
      formatted.push({ role: "assistant", content });
    } else if (msg.role === "user" && msg.toolResult) {
      // User message containing a tool result
      formatted.push({
        role: "user",
        content: [{
          toolResult: {
            toolUseId: msg.toolResult.toolUseId,
            content: [{ json: msg.toolResult.result }],
          },
        }] as ContentBlock[],
      });
    } else {
      // Regular text message
      formatted.push({
        role: msg.role,
        content: [{ text: msg.content || " " }],
      });
    }
  }

  // Append pending tool results (for the current turn)
  if (toolResults && toolResults.length > 0) {
    formatted.push({
      role: "user",
      content: toolResults.map((tr) => ({
        toolResult: {
          toolUseId: tr.toolUseId,
          content: [{ json: tr.result }],
        },
      })) as ContentBlock[],
    });
  }

  // Bedrock requires alternating roles — merge consecutive same-role messages
  return mergeConsecutiveRoles(formatted);
}

/**
 * Merge consecutive messages with the same role into one message.
 * Bedrock Converse API requires strict alternating user/assistant.
 */
function mergeConsecutiveRoles(messages: BedrockMessage[]): BedrockMessage[] {
  if (messages.length === 0) return [];

  const merged: BedrockMessage[] = [messages[0]];

  for (let i = 1; i < messages.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = messages[i];

    if (prev.role === curr.role) {
      // Merge content blocks
      prev.content = [...(prev.content || []), ...(curr.content || [])];
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

/**
 * Parse Bedrock response into our AgentResponse format
 */
function parseAgentResponse(response: {
  output?: { message?: { content?: ContentBlock[] } };
  stopReason?: string;
}): AgentResponse {
  const output = response.output;
  const stopReason = response.stopReason;
  const content = output?.message?.content;

  if (!content || content.length === 0) {
    return {
      type: "text",
      content: "I apologize, but I couldn't generate a response. Please try again.",
    };
  }

  // Check for tool use
  if (stopReason === "tool_use") {
    const toolUseBlock = content.find(
      (block): block is ContentBlock & { toolUse: NonNullable<ContentBlock["toolUse"]> } =>
        "toolUse" in block && block.toolUse !== undefined
    );

    if (toolUseBlock?.toolUse) {
      // Extract any text before tool use
      const textBlock = content.find(
        (block): block is ContentBlock & { text: string } =>
          "text" in block && typeof block.text === "string"
      );

      return {
        type: "tool_use",
        content: textBlock?.text,
        toolUse: {
          id: toolUseBlock.toolUse.toolUseId || "",
          name: toolUseBlock.toolUse.name || "",
          input: (toolUseBlock.toolUse.input as Record<string, unknown>) || {},
        },
      };
    }
  }

  // Regular text response
  const textContent = content
    .filter(
      (block): block is ContentBlock & { text: string } =>
        "text" in block && typeof block.text === "string"
    )
    .map((block) => block.text)
    .join("\n");

  return {
    type: "text",
    content: textContent || "No response generated.",
  };
}

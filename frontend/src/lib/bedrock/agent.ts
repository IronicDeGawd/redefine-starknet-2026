/**
 * AI Agent logic for ZKCred
 */

import { invokeModel, MODEL_ID } from "./client";
import { SYSTEM_PROMPT, buildToolConfig } from "./tools";
import type { Message, ToolResultInput, AgentResponse } from "@/types/agent";
import type {
  ContentBlock,
  Message as BedrockMessage,
} from "@aws-sdk/client-bedrock-runtime";

/**
 * Invoke the AI agent with conversation messages
 */
export async function invokeAgent(
  messages: Message[],
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
 * Build Bedrock message format from our messages
 */
function buildMessages(
  messages: Message[],
  toolResults?: ToolResultInput[]
): BedrockMessage[] {
  const formatted: BedrockMessage[] = messages.map((msg) => ({
    role: msg.role,
    content: [{ text: msg.content }],
  }));

  // Add tool results if present
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

  return formatted;
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

/**
 * /api/chat - AI Agent endpoint
 * Handles conversation with the ZKCred AI assistant
 * Includes content filtering, jailbreak protection, and session storage
 */

import { NextRequest, NextResponse } from "next/server";
import { invokeAgent } from "@/lib/bedrock/agent";
import { validateChatRequest, getErrorMessage, sanitizeString } from "@/lib/utils";
import { filterUserInput, filterAIOutput } from "@/lib/security";
import {
  getSessionMessages,
  addMessageToSession,
  isRedisAvailable,
} from "@/lib/redis";
import type { ChatRequest, ChatResponse, ApiError, ChatMessage } from "@/types/api";

export const runtime = "nodejs";
export const maxDuration = 30; // 30 second timeout for AI response

export async function POST(
  req: NextRequest
): Promise<NextResponse<ChatResponse | ApiError>> {
  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // 2. Validate request structure
    const validation = validateChatRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid request" },
        { status: 400 }
      );
    }

    const request = body as ChatRequest & { sessionId?: string };
    const sessionId = request.sessionId || req.headers.get("x-session-id") || "anonymous";

    // 3. Content filtering on user messages (skip tool result messages)
    const lastUserMessage = request.messages
      .filter((m) => m.role === "user" && m.content && !m.toolResult)
      .pop();
    if (lastUserMessage) {
      const filterResult = filterUserInput(lastUserMessage.content);
      if (!filterResult.allowed) {
        return NextResponse.json({
          type: "text",
          content: filterResult.reason || "I can only help with ZKCred-related questions.",
        });
      }
    }

    // 4. Sanitize message content (preserve toolUse/toolResult for Bedrock)
    const sanitizedMessages: ChatMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeString(msg.content, 5000),
      ...(msg.toolUse ? { toolUse: msg.toolUse } : {}),
      ...(msg.toolResult ? { toolResult: msg.toolResult } : {}),
    }));

    // 5. Load previous session messages if Redis is available
    let fullConversation: ChatMessage[] = sanitizedMessages;
    const redisAvailable = await isRedisAvailable();

    if (redisAvailable && sessionId !== "anonymous") {
      const previousMessages = await getSessionMessages(sessionId);
      if (previousMessages.length > 0) {
        // Merge: previous history + new messages (avoiding duplicates)
        const newContent = sanitizedMessages.map((m) => m.content);
        const uniquePrevious = previousMessages.filter(
          (pm) => !newContent.includes(pm.content)
        );
        fullConversation = [...uniquePrevious.slice(-20), ...sanitizedMessages]; // Keep last 20 + new
      }
    }

    // 6. Invoke the AI agent
    const response = await invokeAgent(fullConversation, request.toolResults);

    // 7. Filter AI output
    if (response.type === "text" && response.content) {
      response.content = filterAIOutput(response.content);
    }

    // 8. Store messages in session (if Redis available)
    if (redisAvailable && sessionId !== "anonymous") {
      // Store the last user message
      if (lastUserMessage) {
        await addMessageToSession(sessionId, {
          role: "user",
          content: lastUserMessage.content,
        });
      }
      // Store the assistant response
      if (response.type === "text" && response.content) {
        await addMessageToSession(sessionId, {
          role: "assistant",
          content: response.content,
        });
      }
    }

    // 9. Return response
    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    const errorName = error instanceof Error ? error.constructor.name : "Unknown";
    console.error(`[/api/chat] ${errorName}: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.error("[/api/chat] Stack:", error.stack.split("\n").slice(0, 5).join("\n"));
    }

    // Check for specific error types
    if (errorMessage.includes("credentials") || errorMessage.includes("AccessDeniedException")) {
      return NextResponse.json(
        { error: "AI service not configured. Please check AWS credentials." },
        { status: 503 }
      );
    }

    if (errorMessage.includes("throttl") || errorMessage.includes("rate") || errorMessage.includes("TooManyRequestsException")) {
      return NextResponse.json(
        { error: "AI service is busy. Please try again in a moment." },
        { status: 429 }
      );
    }

    if (errorMessage.includes("ValidationException") || errorMessage.includes("malformed")) {
      return NextResponse.json(
        { error: "Message format error. Please start a new conversation." },
        { status: 400 }
      );
    }

    if (errorMessage.includes("ModelNotReadyException") || errorMessage.includes("not found") || errorMessage.includes("not available")) {
      return NextResponse.json(
        { error: "AI model is not available. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Chat service error: ${errorMessage.slice(0, 100)}` },
      { status: 500 }
    );
  }
}

/**
 * /api/chat - AI Agent endpoint
 * Handles conversation with the ZKCred AI assistant
 */

import { NextRequest, NextResponse } from "next/server";
import { invokeAgent } from "@/lib/bedrock/agent";
import { validateChatRequest, getErrorMessage, sanitizeString } from "@/lib/utils";
import type { ChatRequest, ChatResponse, ApiError } from "@/types/api";

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

    // 2. Validate request
    const validation = validateChatRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid request" },
        { status: 400 }
      );
    }

    const request = body as ChatRequest;

    // 3. Sanitize message content
    const sanitizedMessages = request.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeString(msg.content, 10000),
    }));

    // 4. Invoke the AI agent
    const response = await invokeAgent(sanitizedMessages, request.toolResults);

    // 5. Return response
    return NextResponse.json(response);
  } catch (error) {
    console.error("[/api/chat] Error:", error);

    // Check for specific error types
    const errorMessage = getErrorMessage(error);

    if (errorMessage.includes("credentials")) {
      return NextResponse.json(
        { error: "AI service not configured. Please check AWS credentials." },
        { status: 503 }
      );
    }

    if (errorMessage.includes("throttl") || errorMessage.includes("rate")) {
      return NextResponse.json(
        { error: "AI service is busy. Please try again in a moment." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process your request. Please try again." },
      { status: 500 }
    );
  }
}

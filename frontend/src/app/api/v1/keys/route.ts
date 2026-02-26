/**
 * POST /api/v1/keys - Create a new API key
 * GET  /api/v1/keys - Validate an existing key (pass via header)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateApiKey,
  storeApiKey,
  extractApiKey,
  validateApiKey,
  RATE_LIMITS,
} from "@/lib/api/auth";
import { createErrorResponse } from "@/lib/api/errors";
import type { ApiKeyInfo } from "@/lib/api/auth";

export const runtime = "nodejs";

interface CreateKeyRequest {
  name: string;
}

interface CreateKeyResponse {
  apiKey: string;
  name: string;
  tier: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  createdAt: string;
}

/**
 * POST - Create a new API key
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: CreateKeyRequest;
  try {
    body = await req.json();
  } catch {
    const { body: errBody, status } = createErrorResponse("BAD_REQUEST", {
      message: "Invalid JSON body",
    });
    return NextResponse.json(errBody, { status });
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    const { body: errBody, status } = createErrorResponse("BAD_REQUEST", {
      message: "name is required (string, non-empty)",
    });
    return NextResponse.json(errBody, { status });
  }

  if (body.name.length > 100) {
    const { body: errBody, status } = createErrorResponse("BAD_REQUEST", {
      message: "name must be 100 characters or fewer",
    });
    return NextResponse.json(errBody, { status });
  }

  const apiKey = generateApiKey();
  const now = Date.now();

  const keyInfo: ApiKeyInfo = {
    id: apiKey.slice(-8), // Last 8 chars as short ID
    name: body.name.trim(),
    tier: "free",
    rateLimit: RATE_LIMITS.free,
    createdAt: now,
  };

  try {
    await storeApiKey(apiKey, keyInfo);
  } catch {
    const { body: errBody, status } = createErrorResponse(
      "SERVICE_UNAVAILABLE",
      { message: "Key storage unavailable. Try again or use a static test key." }
    );
    return NextResponse.json(errBody, { status });
  }

  const response: CreateKeyResponse = {
    apiKey,
    name: keyInfo.name,
    tier: keyInfo.tier,
    rateLimit: keyInfo.rateLimit,
    createdAt: new Date(now).toISOString(),
  };

  return NextResponse.json(response, { status: 201 });
}

/**
 * GET - Validate the API key passed in headers and return its info
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    const { body, status } = createErrorResponse("UNAUTHORIZED");
    return NextResponse.json(body, { status });
  }

  const keyInfo = await validateApiKey(apiKey);
  if (!keyInfo) {
    const { body, status } = createErrorResponse("UNAUTHORIZED");
    return NextResponse.json(body, { status });
  }

  return NextResponse.json({
    id: keyInfo.id,
    name: keyInfo.name,
    tier: keyInfo.tier,
    rateLimit: keyInfo.rateLimit,
    createdAt: new Date(keyInfo.createdAt).toISOString(),
  });
}

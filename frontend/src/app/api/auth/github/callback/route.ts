/**
 * /api/auth/github/callback - GitHub OAuth callback handler
 * Validates CSRF state, exchanges code for access token,
 * stores token in HttpOnly cookie, and redirects to /connect.
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/connectors/github";

export const runtime = "nodejs";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

function pageRedirect(query: string, fromChat: boolean, req: NextRequest): NextResponse {
  const base = APP_URL || req.url;
  const page = fromChat ? "chat" : "connect";
  return NextResponse.redirect(new URL(`${BASE_PATH}/${page}?${query}`, base));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const stateParam = decodeURIComponent(searchParams.get("state") ?? "");
  const stateCookie = req.cookies.get("gh_oauth_state")?.value;
  const fromChat = stateParam.endsWith(":chat");

  if (error) {
    return pageRedirect(`error=${encodeURIComponent(error)}`, fromChat, req);
  }

  if (!code) {
    return pageRedirect("error=missing_code", fromChat, req);
  }

  // Validate CSRF state
  if (!stateParam || !stateCookie || stateParam !== stateCookie) {
    return pageRedirect("error=invalid_state", fromChat, req);
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return pageRedirect("error=github_not_configured", fromChat, req);
  }

  try {
    const accessToken = await exchangeCode(code, clientId, clientSecret);

    const response = pageRedirect("github_success=true", fromChat, req);
    response.cookies.set("gh_verified_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300,
      path: "/",
    });
    response.cookies.delete("gh_oauth_state");
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth failed";
    return pageRedirect(`error=${encodeURIComponent(message)}`, fromChat, req);
  }
}

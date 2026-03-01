/**
 * /api/auth/github/callback - GitHub OAuth callback handler
 * Validates CSRF state, exchanges code for access token,
 * stores token in HttpOnly cookie, and redirects to /connect.
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/connectors/github";

export const runtime = "nodejs";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`${BASE_PATH}/connect?error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`${BASE_PATH}/connect?error=missing_code`, req.url)
    );
  }

  // Validate CSRF state
  const stateParam = searchParams.get("state");
  const stateCookie = req.cookies.get("gh_oauth_state")?.value;
  if (!stateParam || !stateCookie || stateParam !== stateCookie) {
    return NextResponse.redirect(
      new URL(`${BASE_PATH}/connect?error=invalid_state`, req.url)
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`${BASE_PATH}/connect?error=github_not_configured`, req.url)
    );
  }

  try {
    const accessToken = await exchangeCode(code, clientId, clientSecret);

    // Store token in HttpOnly cookie (not in URL)
    const response = NextResponse.redirect(
      new URL(`${BASE_PATH}/connect?github_success=true`, req.url)
    );
    response.cookies.set("gh_verified_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300, // 5 minutes
      path: "/",
    });
    response.cookies.delete("gh_oauth_state");
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth failed";
    return NextResponse.redirect(
      new URL(`${BASE_PATH}/connect?error=${encodeURIComponent(message)}`, req.url)
    );
  }
}

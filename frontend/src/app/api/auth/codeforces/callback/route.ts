/**
 * /api/auth/codeforces/callback - Codeforces OIDC callback handler
 *
 * Exchanges OIDC authorization code for tokens, stores verified handle
 * in an HttpOnly cookie, and redirects to /connect.
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/connectors/codeforces";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateParam = searchParams.get("state");

  if (error) {
    return NextResponse.redirect(
      new URL(`/connect?error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/connect?error=missing_code", req.url)
    );
  }

  // Validate CSRF state
  const stateCookie = req.cookies.get("cf_oauth_state")?.value;
  if (!stateParam || !stateCookie || stateParam !== stateCookie) {
    return NextResponse.redirect(
      new URL("/connect?error=invalid_state", req.url)
    );
  }

  const clientId = process.env.CODEFORCES_CLIENT_ID;
  const clientSecret = process.env.CODEFORCES_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/codeforces/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/connect?error=codeforces_not_configured", req.url)
    );
  }

  try {
    const { handle, rating } = await exchangeCode(
      code,
      clientId,
      clientSecret,
      redirectUri
    );

    // Store verified handle in HttpOnly cookie
    const response = NextResponse.redirect(
      new URL(`/connect?codeforces_success=true`, req.url)
    );

    response.cookies.set("cf_verified_handle", handle, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300, // 5 minutes
      path: "/",
    });

    response.cookies.set("cf_verified_rating", String(rating), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300,
      path: "/",
    });

    // Clear CSRF state
    response.cookies.delete("cf_oauth_state");

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "OIDC exchange failed";
    return NextResponse.redirect(
      new URL(`/connect?error=${encodeURIComponent(message)}`, req.url)
    );
  }
}

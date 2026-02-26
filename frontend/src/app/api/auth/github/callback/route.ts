/**
 * /api/auth/github/callback - GitHub OAuth callback handler
 * Exchanges code for access token and redirects to /connect
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/connectors/github";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

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

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/connect?error=github_not_configured", req.url)
    );
  }

  try {
    const accessToken = await exchangeCode(code, clientId, clientSecret);

    return NextResponse.redirect(
      new URL(
        `/connect?github_token=${encodeURIComponent(accessToken)}`,
        req.url
      )
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth failed";
    return NextResponse.redirect(
      new URL(`/connect?error=${encodeURIComponent(message)}`, req.url)
    );
  }
}

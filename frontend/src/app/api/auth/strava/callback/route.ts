/**
 * /api/auth/strava/callback - Strava OAuth callback handler
 * Exchanges code for token and redirects to credential issuance
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/connectors/strava";

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

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/connect?error=strava_not_configured", req.url)
    );
  }

  try {
    const { accessToken, athleteId } = await exchangeCode(code, clientId, clientSecret);

    // Redirect to connect page with token in a temporary session param
    // In production, use a proper session/cookie mechanism
    return NextResponse.redirect(
      new URL(
        `/connect?strava_token=${encodeURIComponent(accessToken)}&strava_athlete=${athleteId}`,
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

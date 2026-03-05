/**
 * /api/auth/strava/callback - Strava OAuth callback handler
 *
 * [1.2 FIX] Token stored in HttpOnly cookie, NOT in URL params
 * [1.3 FIX] CSRF state validation via cookie comparison
 * [2.2 FIX] athleteId stored in cookie from token exchange (trusted source)
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/connectors/strava";

export const runtime = "nodejs";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

function connectRedirect(query: string, req: NextRequest): NextResponse {
  const base = APP_URL || req.url;
  return NextResponse.redirect(new URL(`${BASE_PATH}/connect?${query}`, base));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateParam = searchParams.get("state");

  if (error) {
    return connectRedirect(`error=${encodeURIComponent(error)}`, req);
  }

  if (!code) {
    return connectRedirect("error=missing_code", req);
  }

  // [1.3 FIX] Validate CSRF state
  const stateCookie = req.cookies.get("strava_oauth_state")?.value;
  if (!stateParam || !stateCookie || stateParam !== stateCookie) {
    return connectRedirect("error=invalid_state", req);
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return connectRedirect("error=strava_not_configured", req);
  }

  try {
    const { accessToken, athleteId } = await exchangeCode(code, clientId, clientSecret);

    // [1.2 FIX] Store token + athleteId in HttpOnly cookies, NOT in URL
    const response = connectRedirect("strava_success=true", req);

    response.cookies.set("strava_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300, // 5 minutes — short-lived
      path: "/",
    });

    // [2.2 FIX] Store verified athleteId from Strava's token exchange
    response.cookies.set("strava_athlete_id", String(athleteId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300,
      path: "/",
    });

    // Clear the CSRF state cookie
    response.cookies.delete("strava_oauth_state");

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth failed";
    return connectRedirect(`error=${encodeURIComponent(message)}`, req);
  }
}

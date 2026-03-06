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

  const stateCookie = req.cookies.get("strava_oauth_state")?.value;
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

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return pageRedirect("error=strava_not_configured", fromChat, req);
  }

  try {
    const { accessToken, athleteId } = await exchangeCode(code, clientId, clientSecret);

    const response = pageRedirect("strava_success=true", fromChat, req);

    response.cookies.set("strava_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300,
      path: "/",
    });

    response.cookies.set("strava_athlete_id", String(athleteId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300,
      path: "/",
    });

    response.cookies.delete("strava_oauth_state");

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth failed";
    return pageRedirect(`error=${encodeURIComponent(message)}`, fromChat, req);
  }
}

/**
 * /api/auth/steam/callback - Steam OpenID callback handler
 *
 * [1.4 FIX] Validates OpenID assertion, stores verified steamId in HttpOnly cookie.
 * The credential route reads from the cookie — not from the request body.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateOpenID } from "@/lib/connectors/steam";

export const runtime = "nodejs";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

function connectRedirect(query: string, req: NextRequest): NextResponse {
  const base = APP_URL || req.url;
  return NextResponse.redirect(new URL(`${BASE_PATH}/connect?${query}`, base));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;

  // Convert search params to Record for validateOpenID
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Check for OpenID mode
  if (!params["openid.mode"]) {
    return connectRedirect("error=invalid_openid_response", req);
  }

  try {
    // Validate the OpenID assertion with Steam
    const steamId = await validateOpenID(params);

    if (!steamId) {
      return connectRedirect("error=steam_validation_failed", req);
    }

    // Store verified steamId in HttpOnly cookie
    const response = connectRedirect("steam_success=true", req);

    response.cookies.set("steam_verified_id", steamId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300, // 5 minutes — short-lived
      path: "/",
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Steam OpenID failed";
    return connectRedirect(`error=${encodeURIComponent(message)}`, req);
  }
}

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

function pageRedirect(query: string, fromChat: boolean, req: NextRequest): NextResponse {
  const base = APP_URL || req.url;
  const page = fromChat ? "chat" : "connect";
  return NextResponse.redirect(new URL(`${BASE_PATH}/${page}?${query}`, base));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;
  // Steam OpenID doesn't use state; we embed from=chat in the return URL directly
  const fromChat = searchParams.get("from") === "chat";

  // Convert search params to Record for validateOpenID
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Check for OpenID mode
  if (!params["openid.mode"]) {
    return pageRedirect("error=invalid_openid_response", fromChat, req);
  }

  try {
    const steamId = await validateOpenID(params);

    if (!steamId) {
      return pageRedirect("error=steam_validation_failed", fromChat, req);
    }

    const response = pageRedirect("steam_success=true", fromChat, req);

    response.cookies.set("steam_verified_id", steamId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300,
      path: "/",
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Steam OpenID failed";
    return pageRedirect(`error=${encodeURIComponent(message)}`, fromChat, req);
  }
}

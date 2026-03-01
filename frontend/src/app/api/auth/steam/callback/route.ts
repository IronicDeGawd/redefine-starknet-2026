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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;

  // Convert search params to Record for validateOpenID
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Check for OpenID mode
  if (!params["openid.mode"]) {
    return NextResponse.redirect(
      new URL(`${BASE_PATH}/connect?error=invalid_openid_response`, req.url)
    );
  }

  try {
    // Validate the OpenID assertion with Steam
    const steamId = await validateOpenID(params);

    if (!steamId) {
      return NextResponse.redirect(
        new URL(`${BASE_PATH}/connect?error=steam_validation_failed`, req.url)
      );
    }

    // Store verified steamId in HttpOnly cookie
    const response = NextResponse.redirect(
      new URL(`${BASE_PATH}/connect?steam_success=true`, req.url)
    );

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
    return NextResponse.redirect(
      new URL(`${BASE_PATH}/connect?error=${encodeURIComponent(message)}`, req.url)
    );
  }
}

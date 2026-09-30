import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { generateCodeVerifier, generateState } from "arctic";
import { AUTH_COOKIES } from "@/lib/constants";
import { safeNextPath } from "@/lib/safe-redirect";
import { googleClient } from "@/server/auth/google";
import { handleError } from "@/server/http/handler";

/** Start Google OAuth (authorization code + PKCE). */
export async function GET(req: NextRequest) {
  try {
    const state = generateState();
    const verifier = generateCodeVerifier();
    const url = googleClient().createAuthorizationURL(state, verifier, ["openid", "profile", "email"]);
    const jar = await cookies();
    const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
    const next = safeNextPath(req.nextUrl.searchParams.get("next"));
    jar.set(AUTH_COOKIES.oauthState, `${state}|${encodeURIComponent(next)}`, opts);
    jar.set(AUTH_COOKIES.oauthVerifier, verifier, opts);
    return NextResponse.redirect(url);
  } catch (err) {
    return handleError(err, req);
  }
}

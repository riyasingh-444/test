import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIES } from "@/lib/constants";
import { safeNextPath } from "@/lib/safe-redirect";
import { childLogger } from "@/lib/logger";
import { connectDB } from "@/server/db/connection";
import { exchangeGoogleCode } from "@/server/auth/google";
import { setAuthCookies } from "@/server/auth/session";
import { clientIp } from "@/server/http/rate-limit";
import { authService } from "@/server/services/auth.service";

const log = childLogger("auth.google");

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const [storedState, encodedNext] = (jar.get(AUTH_COOKIES.oauthState)?.value ?? "").split("|");
  const verifier = jar.get(AUTH_COOKIES.oauthVerifier)?.value;
  jar.delete(AUTH_COOKIES.oauthState);
  jar.delete(AUTH_COOKIES.oauthVerifier);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const next = safeNextPath(encodedNext ? decodeURIComponent(encodedNext) : "/");

  if (!code || !state || !storedState || state !== storedState || !verifier) {
    return NextResponse.redirect(new URL("/login?error=oauth_state", req.url));
  }
  try {
    await connectDB();
    const profile = await exchangeGoogleCode(code, verifier);
    const { tokens } = await authService.loginWithGoogle(profile, { userAgent: req.headers.get("user-agent"), ip: clientIp(req) });
    await setAuthCookies(tokens);
    return NextResponse.redirect(new URL(next, req.url));
  } catch (err) {
    log.warn({ err }, "Google sign-in failed");
    return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIES } from "@/lib/constants";
import { safeNextPath } from "@/lib/safe-redirect";
import { refreshSchema } from "@/lib/validation/auth";
import { connectDB } from "@/server/db/connection";
import { api, ok } from "@/server/http/handler";
import { errors } from "@/server/http/errors";
import { clientIp } from "@/server/http/rate-limit";
import { clearAuthCookies, isMobileClient, rotateSession, setAuthCookies } from "@/server/auth/session";

/** POST: rotate tokens. Web uses the refresh cookie; mobile sends { refreshToken }. */
export const POST = api({ body: refreshSchema, rateLimit: "auth" }, async ({ body, req, ip }) => {
  const mobile = await isMobileClient();
  const token = mobile ? body.refreshToken : (await cookies()).get(AUTH_COOKIES.refresh)?.value;
  if (!token) throw errors.unauthenticated();
  try {
    const tokens = await rotateSession(token, { userAgent: req.headers.get("user-agent"), ip });
    if (mobile) return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, accessExpiresAt: tokens.accessExpiresAt };
    await setAuthCookies(tokens);
    return ok({ refreshed: true });
  } catch (err) {
    if (!mobile) await clearAuthCookies();
    throw err;
  }
});

/**
 * GET: redirect-based refresh used by proxy.ts for page navigations when the
 * access token has expired but a refresh cookie exists.
 */
export async function GET(req: NextRequest) {
  const next = safeNextPath(req.nextUrl.searchParams.get("next"));
  const token = (await cookies()).get(AUTH_COOKIES.refresh)?.value;
  if (!token) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url));
  try {
    await connectDB();
    const tokens = await rotateSession(token, { userAgent: req.headers.get("user-agent"), ip: clientIp(req) });
    await setAuthCookies(tokens);
    return NextResponse.redirect(new URL(next, req.url));
  } catch {
    await clearAuthCookies();
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url));
  }
}

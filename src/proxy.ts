import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIES, type Role } from "@/lib/constants";
import { verifyAccessToken } from "@/server/auth/tokens";

/**
 * Optimistic route gating (Next 16 Proxy). Real authorization is enforced again in every
 * page/route handler via getCurrentUser()/requireRole() — this only improves UX by
 * redirecting early and transparently refreshing expired access tokens.
 */
const PROTECTED: { prefix: string; roles?: Role[] }[] = [
  { prefix: "/account" },
  { prefix: "/book" },
  { prefix: "/partner", roles: ["ARTIST", "SALON"] },
  { prefix: "/admin", roles: ["ADMIN"] },
];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const next = encodeURIComponent(pathname + search);
  const claims = await verifyAccessToken(req.cookies.get(AUTH_COOKIES.access)?.value);
  const hasSession = req.cookies.has(AUTH_COOKIES.hint);
  const rule = PROTECTED.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));

  if (!claims && hasSession) {
    // Access token expired but a refresh session exists: rotate, then come back.
    const isDocument = req.headers.get("sec-fetch-dest") === "document";
    if (rule || isDocument) {
      return NextResponse.redirect(new URL(`/api/v1/auth/refresh?next=${next}`, req.url));
    }
  }

  if (rule) {
    if (!claims) return NextResponse.redirect(new URL(`/login?next=${next}`, req.url));
    if (rule.roles && !rule.roles.includes(claims.role)) {
      return NextResponse.redirect(new URL("/?denied=1", req.url));
    }
  }

  if ((pathname === "/login" || pathname === "/register") && claims) {
    return NextResponse.redirect(new URL(homeFor(claims.role), req.url));
  }

  return NextResponse.next();
}

function homeFor(role: Role) {
  if (role === "ADMIN") return "/admin";
  if (role === "ARTIST" || role === "SALON") return "/partner";
  return "/";
}

export const config = {
  matcher: [
    // Pages only — skip API, Next internals and static files.
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico)$).*)",
  ],
};

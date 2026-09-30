import "server-only";
import { cookies, headers } from "next/headers";
import { Types } from "mongoose";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTH_COOKIES,
  REFRESH_TOKEN_TTL_DAYS,
  type Role,
} from "@/lib/constants";
import { Session, User } from "@/server/models";
import { errors } from "@/server/http/errors";
import { childLogger } from "@/lib/logger";
import { generateOpaqueToken, sha256, signAccessToken, verifyAccessToken, type AccessClaims } from "./tokens";

const log = childLogger("auth.session");

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
};

type SessionUser = { _id: Types.ObjectId; role: Role; name: string };

export async function issueSession(
  user: SessionUser,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<IssuedTokens> {
  const refreshToken = generateOpaqueToken();
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  const session = await Session.create({
    userId: user._id,
    tokenHash: await sha256(refreshToken),
    userAgent: meta.userAgent?.slice(0, 300),
    ip: meta.ip ?? undefined,
    expiresAt: refreshExpiresAt,
  });
  const accessToken = await signAccessToken({
    sub: String(user._id),
    role: user.role,
    sid: String(session._id),
    name: user.name,
  });
  return {
    accessToken,
    refreshToken,
    accessExpiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000),
    refreshExpiresAt,
  };
}

/**
 * Rotate a refresh token. Presenting an already-rotated token is treated as theft:
 * every session for that user is revoked (refresh-token reuse detection).
 */
export async function rotateSession(refreshToken: string, meta: { userAgent?: string | null; ip?: string | null } = {}) {
  const tokenHash = await sha256(refreshToken);
  const session = await Session.findOne({ tokenHash });
  if (!session || session.expiresAt < new Date()) throw errors.unauthenticated("Your session has expired");

  if (session.revokedAt) {
    log.warn({ userId: String(session.userId) }, "Refresh token reuse detected — revoking all sessions");
    await Session.updateMany({ userId: session.userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
    throw errors.unauthenticated("Your session has expired");
  }

  const user = await User.findById(session.userId).select("role name status").lean();
  if (!user || user.status !== "ACTIVE") throw errors.unauthenticated();

  const next = await issueSession({ _id: user._id, role: user.role, name: user.name }, meta);
  // Atomic guard: only one concurrent refresh wins.
  const res = await Session.updateOne(
    { _id: session._id, revokedAt: null },
    { $set: { revokedAt: new Date(), replacedBy: await sha256(next.refreshToken) } },
  );
  if (res.modifiedCount !== 1) {
    await Session.deleteOne({ tokenHash: await sha256(next.refreshToken) });
    throw errors.unauthenticated("Your session has expired");
  }
  return next;
}

export async function revokeSession(sessionId: string) {
  if (!Types.ObjectId.isValid(sessionId)) return;
  await Session.updateOne({ _id: sessionId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function revokeAllSessions(userId: string) {
  await Session.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

/* ── Cookies (web clients) ───────────────────────────────── */

const secure = process.env.NODE_ENV === "production";

export async function setAuthCookies(tokens: IssuedTokens) {
  const jar = await cookies();
  jar.set(AUTH_COOKIES.access, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: tokens.accessExpiresAt,
  });
  jar.set(AUTH_COOKIES.refresh, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/v1/auth",
    expires: tokens.refreshExpiresAt,
  });
  jar.set(AUTH_COOKIES.hint, "1", { httpOnly: false, secure, sameSite: "lax", path: "/", expires: tokens.refreshExpiresAt });
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete({ name: AUTH_COOKIES.access, path: "/" });
  jar.delete({ name: AUTH_COOKIES.refresh, path: "/api/v1/auth" });
  jar.delete({ name: AUTH_COOKIES.hint, path: "/" });
}

/** Mobile clients identify themselves and receive tokens in the body instead of cookies. */
export async function isMobileClient() {
  return (await headers()).get("x-rivya-client") === "mobile";
}

/* ── Reading the current principal ──────────────────────── */

/** Resolve claims from `Authorization: Bearer` (mobile) or the access cookie (web). */
export async function readAccessClaims(): Promise<AccessClaims | null> {
  const h = await headers();
  const authz = h.get("authorization");
  if (authz?.startsWith("Bearer ")) return verifyAccessToken(authz.slice(7).trim());
  const jar = await cookies();
  return verifyAccessToken(jar.get(AUTH_COOKIES.access)?.value);
}

import "server-only";
import { cache } from "react";
import type { Role } from "@/lib/constants";
import { connectDB } from "@/server/db/connection";
import { errors } from "@/server/http/errors";
import { Session, User } from "@/server/models";
import { readAccessClaims } from "./session";

export type AuthUser = {
  id: string;
  sessionId: string;
  role: Role;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
};

/**
 * Current authenticated user, validated against the database (so suspended accounts,
 * revoked sessions and role changes take effect immediately). Memoised per request.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const claims = await readAccessClaims();
  if (!claims) return null;
  await connectDB();
  const [user, session] = await Promise.all([
    User.findById(claims.sub).select("name email phone role status avatarUrl").lean(),
    Session.findById(claims.sid).select("revokedAt expiresAt").lean(),
  ]);
  if (!user || user.status !== "ACTIVE") return null;
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  return {
    id: String(user._id),
    sessionId: claims.sid,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
  };
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw errors.unauthenticated();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<AuthUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw errors.forbidden();
  return user;
}

import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import { ACCESS_TOKEN_TTL_SECONDS, ROLES, type Role } from "@/lib/constants";

/**
 * Access tokens: short-lived HS256 JWTs carrying only non-sensitive claims.
 * Kept free of DB/env-module imports so proxy.ts can verify them cheaply.
 */
export type AccessClaims = { sub: string; role: Role; sid: string; name: string };

const ISSUER = "rivya";
const AUDIENCE = "rivya-app";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set (>= 32 chars)");
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(claims: AccessClaims, ttlSeconds = ACCESS_TOKEN_TTL_SECONDS) {
  return new SignJWT({ role: claims.role, sid: claims.sid, name: claims.name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secretKey());
}

export async function verifyAccessToken(token: string | undefined | null): Promise<AccessClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    const role = payload.role as Role;
    if (!payload.sub || !ROLES.includes(role) || typeof payload.sid !== "string") return null;
    return { sub: payload.sub, role, sid: payload.sid, name: String(payload.name ?? "") };
  } catch (err) {
    if (err instanceof joseErrors.JOSEError) return null;
    throw err;
  }
}

/** Opaque refresh token (256-bit). Only its SHA-256 hash is persisted. */
export function generateOpaqueToken(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Buffer.from(buf).toString("base64url");
}

export async function sha256(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Buffer.from(digest).toString("hex");
}

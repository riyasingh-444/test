import "server-only";
import { Google, decodeIdToken } from "arctic";
import { env, integrations } from "@/lib/config/env";
import { errors } from "@/server/http/errors";

export function googleClient() {
  if (!integrations.google()) throw errors.notConfigured("Google login", ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);
  const e = env();
  return new Google(e.GOOGLE_CLIENT_ID!, e.GOOGLE_CLIENT_SECRET!, `${e.APP_URL}/api/v1/auth/google/callback`);
}

export type GoogleProfile = { googleId: string; email?: string; emailVerified: boolean; name: string; picture?: string };

/**
 * The ID token is received directly from Google's token endpoint over TLS in the
 * authorization-code flow, so per OIDC Core §3.1.3.7 its signature need not be re-verified.
 */
export async function exchangeGoogleCode(code: string, codeVerifier: string): Promise<GoogleProfile> {
  const tokens = await googleClient().validateAuthorizationCode(code, codeVerifier);
  const claims = decodeIdToken(tokens.idToken()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  return {
    googleId: claims.sub,
    email: claims.email?.toLowerCase(),
    emailVerified: Boolean(claims.email_verified),
    name: claims.name ?? claims.email?.split("@")[0] ?? "Rivya member",
    picture: claims.picture,
  };
}

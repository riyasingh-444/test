import "server-only";
import type { PublicUser } from "@/server/services/auth.service";
import { ok } from "@/server/http/handler";
import { isMobileClient, setAuthCookies, type IssuedTokens } from "./session";

/**
 * Web clients get httpOnly cookies and never see tokens.
 * Mobile clients (x-rivya-client: mobile) receive tokens in the body for secure storage.
 */
export async function respondWithSession(result: { user: PublicUser; tokens: IssuedTokens }, status = 200) {
  if (await isMobileClient()) {
    return ok(
      {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        accessExpiresAt: result.tokens.accessExpiresAt,
      },
      undefined,
      { status },
    );
  }
  await setAuthCookies(result.tokens);
  return ok({ user: result.user }, undefined, { status });
}

import { api } from "@/server/http/handler";
import { clearAuthCookies, revokeSession } from "@/server/auth/session";

export const POST = api({ auth: "optional" }, async ({ user }) => {
  if (user) await revokeSession(user.sessionId);
  await clearAuthCookies();
  return { signedOut: true };
});

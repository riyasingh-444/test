import { api } from "@/server/http/handler";
import { clearAuthCookies } from "@/server/auth/session";
import { accountService } from "@/server/services/account.service";

/** Sign out of every device (revokes all refresh sessions). */
export const DELETE = api({ auth: "required", rateLimit: "auth" }, async ({ user }) => {
  await accountService.signOutEverywhere(user.id);
  await clearAuthCookies();
  return { signedOut: true };
});

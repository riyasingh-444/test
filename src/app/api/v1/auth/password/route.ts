import { changePasswordSchema } from "@/lib/validation/auth";
import { api } from "@/server/http/handler";
import { authService } from "@/server/services/auth.service";

export const POST = api({ auth: "required", body: changePasswordSchema, rateLimit: "auth" }, async ({ body, user }) => {
  await authService.changePassword(user.id, body.currentPassword, body.newPassword);
  return { updated: true };
});

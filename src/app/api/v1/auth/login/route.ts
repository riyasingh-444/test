import { loginSchema } from "@/lib/validation/auth";
import { api } from "@/server/http/handler";
import { respondWithSession } from "@/server/auth/respond";
import { authService } from "@/server/services/auth.service";

export const POST = api({ body: loginSchema, rateLimit: "auth" }, async ({ body, req, ip }) => {
  const result = await authService.login(body, { userAgent: req.headers.get("user-agent"), ip });
  return respondWithSession(result);
});

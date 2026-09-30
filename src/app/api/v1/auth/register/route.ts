import { registerSchema } from "@/lib/validation/auth";
import { api } from "@/server/http/handler";
import { respondWithSession } from "@/server/auth/respond";
import { authService } from "@/server/services/auth.service";

export const POST = api({ body: registerSchema, rateLimit: "auth" }, async ({ body, req, ip }) => {
  const result = await authService.register(body, { userAgent: req.headers.get("user-agent"), ip });
  return respondWithSession(result, 201);
});

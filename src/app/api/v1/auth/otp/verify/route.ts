import { otpVerifySchema } from "@/lib/validation/auth";
import { api } from "@/server/http/handler";
import { respondWithSession } from "@/server/auth/respond";
import { authService } from "@/server/services/auth.service";

export const POST = api({ body: otpVerifySchema, rateLimit: "auth" }, async ({ body, req, ip }) => {
  const result = await authService.verifyOtp(body, { userAgent: req.headers.get("user-agent"), ip });
  return respondWithSession(result);
});

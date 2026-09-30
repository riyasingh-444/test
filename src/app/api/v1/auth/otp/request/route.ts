import { otpRequestSchema } from "@/lib/validation/auth";
import { api } from "@/server/http/handler";
import { authService } from "@/server/services/auth.service";

export const POST = api({ body: otpRequestSchema, rateLimit: "otp" }, async ({ body }) => authService.requestOtp(body.phone));

import { updateProfileSchema } from "@/lib/validation/account";
import { api } from "@/server/http/handler";
import { accountService } from "@/server/services/account.service";

export const GET = api({ auth: "required" }, async ({ user }) => accountService.getProfile(user.id));

export const PATCH = api({ auth: "required", body: updateProfileSchema, rateLimit: "write" }, async ({ body, user }) =>
  accountService.updateProfile(user.id, body),
);

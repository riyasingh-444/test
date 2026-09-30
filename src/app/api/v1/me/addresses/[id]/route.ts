import { api } from "@/server/http/handler";
import { accountService } from "@/server/services/account.service";

export const DELETE = api<{ id: string }, undefined, undefined, "required">({ auth: "required", rateLimit: "write" }, async ({ params, user }) =>
  accountService.removeAddress(user.id, params.id),
);

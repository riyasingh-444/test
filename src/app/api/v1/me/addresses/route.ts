import { savedAddressSchema } from "@/lib/validation/account";
import { api, ok } from "@/server/http/handler";
import { accountService } from "@/server/services/account.service";

export const GET = api({ auth: "required" }, async ({ user }) => accountService.listAddresses(user.id));

export const POST = api({ auth: "required", body: savedAddressSchema, rateLimit: "write" }, async ({ body, user }) =>
  ok(await accountService.addAddress(user.id, body), undefined, { status: 201 }),
);

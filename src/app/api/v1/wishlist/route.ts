import { wishlistAddSchema, wishlistListSchema } from "@/lib/validation/engagement";
import { api, ok } from "@/server/http/handler";
import { wishlistService } from "@/server/services/wishlist.service";

export const POST = api({ auth: "required", body: wishlistAddSchema, rateLimit: "write" }, async ({ body, user }) =>
  ok(await wishlistService.add(user, body.targetType, body.targetId), undefined, { status: 201 }),
);

export const GET = api({ auth: "required", query: wishlistListSchema }, async ({ query, user }) => {
  const { items, ...meta } = await wishlistService.list(user, query);
  return ok(items, meta);
});

import { looksQuerySchema } from "@/lib/validation/discovery";
import { api, ok } from "@/server/http/handler";
import { discoveryService } from "@/server/services/discovery.service";

/** Explore Looks feed (cursor pagination for infinite scroll). */
export const GET = api({ query: looksQuerySchema, rateLimit: "read" }, async ({ query }) => {
  const { items, nextCursor } = await discoveryService.listLooks(query);
  return ok(items, { nextCursor });
});

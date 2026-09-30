import { providerSearchSchema } from "@/lib/validation/discovery";
import { api, ok } from "@/server/http/handler";
import { searchService } from "@/server/search/mongo";

/** Search & filter salons (paginated). */
export const GET = api({ query: providerSearchSchema, rateLimit: "read" }, async ({ query }) => {
  const { items, ...meta } = await searchService.searchProviders("SALON", query);
  return ok(items, meta);
});

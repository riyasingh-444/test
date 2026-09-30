import { providerSearchSchema } from "@/lib/validation/discovery";
import { api, ok } from "@/server/http/handler";
import { searchService } from "@/server/search/mongo";

/** Search & filter artists (paginated). */
export const GET = api({ query: providerSearchSchema, rateLimit: "read" }, async ({ query }) => {
  const { items, ...meta } = await searchService.searchProviders("ARTIST", query);
  return ok(items, meta);
});

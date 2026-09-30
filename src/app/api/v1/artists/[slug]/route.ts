import { after } from "next/server";
import { api } from "@/server/http/handler";
import { discoveryService } from "@/server/services/discovery.service";

/** Public profile by slug or id. */
export const GET = api<{ slug: string }>({}, async ({ params }) => {
  const profile = await discoveryService.getArtistProfile(params.slug);
  after(() => discoveryService.recordProfileView("ARTIST", profile.id).catch(() => undefined));
  return profile;
});

import { describe, expect, it } from "vitest";
import "./helpers";
import { providerSearchSchema } from "@/lib/validation/discovery";
import { searchService } from "@/server/search/mongo";
import { wishlistService } from "@/server/services/wishlist.service";
import { Artist } from "@/server/models";
import { makeArtist, makeCategory, makeUser } from "./factories";
import { call } from "./helpers";
import { GET as artistsRoute } from "@/app/api/v1/artists/route";

const search = (q: Record<string, unknown>) => searchService.searchProviders("ARTIST", providerSearchSchema.parse(q));

describe("provider search", () => {
  it("filters by city, category, price and rating, and paginates", async () => {
    const bridal = await makeCategory("bridal-makeup", "bridal");
    await makeArtist({ name: "Aanya Bridal", categoryId: bridal._id, rating: 4.9, reviews: 40, price: 2_000_000 });
    await makeArtist({ name: "Kavya Looks", rating: 4.2, reviews: 5, price: 300_000 });
    await makeArtist({ name: "Mumbai Glam", city: "Mumbai", point: [72.87, 19.07], rating: 4.8, reviews: 12 });

    expect((await search({ city: "delhi" })).total).toBe(2);
    expect((await search({ category: "bridal-makeup" })).items.map((i) => i.name)).toEqual(["Aanya Bridal"]);
    expect((await search({ maxPrice: 4000 })).items.map((i) => i.name)).toEqual(["Kavya Looks"]);
    expect((await search({ minRating: 4.5, sort: "rating" })).items.map((i) => i.name)).toEqual(["Aanya Bridal", "Mumbai Glam"]);
    expect((await search({ q: "bridal" })).items.map((i) => i.name)).toEqual(["Aanya Bridal"]);

    const page = await search({ limit: 2, page: 1, sort: "rating" });
    expect(page).toMatchObject({ total: 3, hasMore: true });
    expect(page.items).toHaveLength(2);
  });

  it("sorts by distance with geo queries and reports distanceKm", async () => {
    await makeArtist({ name: "Near", point: [77.2, 28.6] });
    await makeArtist({ name: "Far", point: [77.35, 28.7] });
    await makeArtist({ name: "Other city", city: "Mumbai", point: [72.87, 19.07] });
    const res = await search({ lat: 28.6, lng: 77.2, radiusKm: 30, sort: "nearest" });
    expect(res.items.map((i) => i.name)).toEqual(["Near", "Far"]);
    expect(res.items[0]!.distanceKm).toBe(0);
    expect(res.items[1]!.distanceKm).toBeGreaterThan(10);
  });

  it("never lists rejected or inactive partners", async () => {
    const { artist } = await makeArtist({ name: "Hidden" });
    await Artist.updateOne({ _id: artist._id }, { verificationStatus: "REJECTED" });
    expect((await search({})).total).toBe(0);
  });

  it("rejects invalid query params over HTTP", async () => {
    const res = await call(artistsRoute, { url: "/api/v1/artists?limit=9999&sort=hack" });
    expect(res.status).toBe(422);
  });
});

describe("wishlist", () => {
  it("saves idempotently and lists hydrated items", async () => {
    const { artist } = await makeArtist({ name: "Saved Artist" });
    const user = await makeUser();
    await wishlistService.add(user, "ARTIST", String(artist._id));
    await wishlistService.add(user, "ARTIST", String(artist._id));
    const list = await wishlistService.list(user, { page: 1, limit: 10 });
    expect(list.total).toBe(1);
    expect(list.items[0]!.provider?.name).toBe("Saved Artist");
    await wishlistService.remove(user, { targetType: "ARTIST", targetId: String(artist._id) });
    expect((await wishlistService.list(user, { page: 1, limit: 10 })).total).toBe(0);
  });
});

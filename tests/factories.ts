import { Types } from "mongoose";
import type { AuthUser } from "@/server/auth/current-user";
import { addDaysToKey, todayKey } from "@/lib/time";
import { Artist, Availability, Category, Salon, Service, User } from "@/server/models";
import type { Role } from "@/lib/constants";

let n = 0;
const uniq = () => `${Date.now().toString(36)}${(n++).toString(36)}`;

export async function makeUser(role: Role = "CUSTOMER", name = "Test User"): Promise<AuthUser> {
  const u = await User.create({ name, email: `u${uniq()}@example.com`, role, phone: undefined });
  return { id: String(u._id), sessionId: new Types.ObjectId().toString(), role, name, email: u.email };
}

export async function makeCategory(slug = `cat-${uniq()}`, group = "makeup") {
  return Category.create({ slug, name: slug.replace(/-/g, " "), group });
}

const ALL_DAYS_10_TO_19 = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, isOpen: true, open: "10:00", close: "19:00" }));

export async function makeArtist(opts: {
  city?: string;
  point?: [number, number];
  categoryId?: Types.ObjectId;
  serviceMode?: "HOME" | "STUDIO" | "BOTH";
  rating?: number;
  reviews?: number;
  price?: number;
  verified?: boolean;
  capacity?: number;
  name?: string;
} = {}) {
  const owner = await makeUser("ARTIST", opts.name ?? "Artist Owner");
  const category = opts.categoryId ? { _id: opts.categoryId } : await makeCategory();
  const artist = await Artist.create({
    userId: owner.id,
    slug: `artist-${uniq()}`,
    displayName: opts.name ?? "Meera Artistry",
    categoryIds: [category._id],
    location: { city: opts.city ?? "Delhi", area: "Hauz Khas", point: { type: "Point", coordinates: opts.point ?? [77.2, 28.55] } },
    serviceMode: opts.serviceMode ?? "BOTH",
    serviceRadiusKm: 20,
    ratingAvg: opts.rating ?? 0,
    reviewCount: opts.reviews ?? 0,
    startingPrice: opts.price ?? 500_000,
    verificationStatus: opts.verified === false ? "PENDING" : "VERIFIED",
  });
  const service = await Service.create({
    providerType: "ARTIST",
    providerId: artist._id,
    categoryId: category._id,
    name: "Party Makeup",
    price: opts.price ?? 500_000,
    durationMin: 90,
    bufferMin: 30,
    serviceMode: "BOTH",
    homeServiceFee: 50_000,
  });
  await Availability.create({
    providerType: "ARTIST",
    providerId: artist._id,
    weeklyHours: ALL_DAYS_10_TO_19,
    minNoticeMin: 60,
    capacity: opts.capacity ?? 1,
  });
  return { owner, artist, service, categoryId: category._id };
}

export async function makeSalon(opts: { city?: string; point?: [number, number]; categoryId?: Types.ObjectId } = {}) {
  const owner = await makeUser("SALON", "Salon Owner");
  const category = opts.categoryId ? { _id: opts.categoryId } : await makeCategory();
  const salon = await Salon.create({
    ownerId: owner.id,
    slug: `salon-${uniq()}`,
    name: "Lotus Salon",
    categoryIds: [category._id],
    location: { city: opts.city ?? "Delhi", point: { type: "Point", coordinates: opts.point ?? [77.21, 28.6] } },
    verificationStatus: "VERIFIED",
    startingPrice: 150_000,
  });
  return { owner, salon };
}

/** A date a few days out, so min-notice and "past" rules never interfere. */
export const futureDate = (days = 3) => addDaysToKey(todayKey(), days);

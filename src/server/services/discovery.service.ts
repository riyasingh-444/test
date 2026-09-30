import "server-only";
import { Types } from "mongoose";
import type { ProviderType } from "@/lib/constants";
import { findCity } from "@/lib/catalog";
import type { LooksQuery } from "@/lib/validation/discovery";
import { Artist, Category, PortfolioItem, ProviderDailyStat, Review, Salon, Service } from "@/server/models";
import { errors } from "@/server/http/errors";
import { toImage, toLook, toProviderCard, toReview, toService } from "@/server/mappers";
import { todayKey } from "@/lib/time";
import type {
  ArtistProfileDTO,
  CategoryDTO,
  LookDTO,
  Paginated,
  ReviewDTO,
  SalonProfileDTO,
  ServiceDTO,
} from "@/types/dto";

const byKey = (key: string) =>
  /^[a-f\d]{24}$/i.test(key) ? { _id: new Types.ObjectId(key) } : { slug: key.toLowerCase() };

const PUBLIC_PROVIDER = { isActive: true, verificationStatus: { $ne: "REJECTED" } } as const;

async function categoryMap(ids?: Types.ObjectId[]) {
  const cats = await Category.find(ids ? { _id: { $in: ids } } : { isActive: true }).select("slug name group sortOrder").lean();
  return new Map(cats.map((c) => [String(c._id), c]));
}

export const discoveryService = {
  async listCategories(): Promise<CategoryDTO[]> {
    const cats = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    return cats.map((c) => ({ id: String(c._id), slug: c.slug, name: c.name, group: c.group, image: toImage(c.image) }));
  },

  /** Accepts a slug (web URLs) or an id (mobile/API clients). */
  async getArtistProfile(slugOrId: string): Promise<ArtistProfileDTO> {
    const a = await Artist.findOne({ ...byKey(slugOrId), ...PUBLIC_PROVIDER }).lean();
    if (!a) throw errors.notFound("Artist");
    const cats = await categoryMap(a.categoryIds);
    const salon = a.salonId ? await Salon.findById(a.salonId).select("slug name").lean() : null;
    const card = toProviderCard(
      { ...a, categoryNames: a.categoryIds.map((id) => cats.get(String(id))?.name).filter((n): n is string => Boolean(n)) },
      "ARTIST",
    );
    return {
      ...card,
      type: "ARTIST",
      bio: a.bio ?? null,
      languages: a.languages ?? [],
      styles: a.styles ?? [],
      serviceRadiusKm: a.serviceRadiusKm ?? null,
      socialLinks: a.socialLinks ? { ...a.socialLinks } : null,
      policies: a.policies
        ? { cancellation: a.policies.cancellation, advancePercent: a.policies.advancePercent, travelNote: a.policies.travelNote }
        : null,
      salon: salon ? { id: String(salon._id), slug: salon.slug, name: salon.name } : null,
      memberSince: a.createdAt.toISOString(),
      location: { lng: a.location.point.coordinates[0]!, lat: a.location.point.coordinates[1]! },
    };
  },

  async getSalonProfile(slugOrId: string): Promise<SalonProfileDTO> {
    const s = await Salon.findOne({ ...byKey(slugOrId), ...PUBLIC_PROVIDER }).lean();
    if (!s) throw errors.notFound("Salon");
    const cats = await categoryMap(s.categoryIds);
    const staff = await Artist.find({ _id: { $in: s.staffArtistIds }, isActive: true }).limit(24).lean();
    const card = toProviderCard(
      { ...s, categoryNames: s.categoryIds.map((id) => cats.get(String(id))?.name).filter((n): n is string => Boolean(n)) },
      "SALON",
    );
    const loc = s.location;
    return {
      ...card,
      type: "SALON",
      description: s.description ?? null,
      images: s.images.map(toImage).filter((i) => i !== null),
      openingHours: s.openingHours.map((h) => ({ day: h.day, isOpen: h.isOpen ?? true, open: h.open, close: h.close })),
      amenities: s.amenities ?? [],
      address: [loc.addressLine, loc.area, loc.city, loc.pincode].filter(Boolean).join(", ") || null,
      contactPhone: s.contactPhone ?? null,
      offersHomeService: s.offersHomeService ?? false,
      staff: staff.map((a) => toProviderCard(a, "ARTIST")),
      location: { lng: loc.point.coordinates[0]!, lat: loc.point.coordinates[1]! },
      memberSince: s.createdAt.toISOString(),
    };
  },

  async listServices(providerType: ProviderType, providerId: string): Promise<ServiceDTO[]> {
    const services = await Service.find({ providerType, providerId, isActive: true }).sort({ sortOrder: 1, price: 1 }).lean();
    const cats = await categoryMap([...new Set(services.map((s) => s.categoryId))]);
    return services.map((s) => toService(s, cats.get(String(s.categoryId))?.name));
  },

  async listReviews(providerId: string, page: number, limit: number): Promise<Paginated<ReviewDTO> & { distribution: Record<number, number> }> {
    const filter = { providerId: new Types.ObjectId(providerId), status: "PUBLISHED" as const };
    const [items, total, dist] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Review.countDocuments(filter),
      Review.aggregate<{ _id: number; n: number }>([{ $match: filter }, { $group: { _id: "$rating", n: { $sum: 1 } } }]),
    ]);
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of dist) distribution[d._id] = d.n;
    return { items: items.map(toReview), page, limit, total, hasMore: page * limit < total, distribution };
  },

  /** Explore Looks feed — cursor-paginated (newest first) for infinite scroll. */
  async listLooks(q: LooksQuery): Promise<{ items: LookDTO[]; nextCursor: string | null }> {
    const filter: Record<string, unknown> = { isActive: true };
    if (q.providerId) filter.providerId = new Types.ObjectId(q.providerId);
    if (q.style) filter.styleTags = q.style;
    if (q.category) {
      const cat = await Category.findOne({ slug: q.category }).select("_id").lean();
      if (!cat) return { items: [], nextCursor: null };
      filter.categoryId = cat._id;
    }
    if (q.city) filter.city = findCity(q.city)?.name ?? q.city;
    if (q.cursor) filter._id = { $lt: new Types.ObjectId(q.cursor) };

    const docs = await PortfolioItem.find(filter).sort({ _id: -1 }).limit(q.limit + 1).lean();
    const page = docs.slice(0, q.limit);
    return {
      items: await hydrateLooks(page),
      nextCursor: docs.length > q.limit ? String(page[page.length - 1]!._id) : null,
    };
  },

  async getLook(id: string): Promise<LookDTO> {
    const doc = await PortfolioItem.findOne({ _id: id, isActive: true }).lean();
    const [look] = doc ? await hydrateLooks([doc]) : [];
    if (!look) throw errors.notFound("Look");
    return look;
  },

  /** Recent 5★ verified reviews with text, for homepage testimonials. */
  async featuredReviews(limit = 3) {
    const reviews = await Review.find({ status: "PUBLISHED", rating: 5, comment: { $exists: true, $ne: "" } })
      .sort({ createdAt: -1 })
      .limit(limit * 4)
      .lean();
    // One per provider for variety.
    const seen = new Set<string>();
    const picked = reviews.filter((r) => !seen.has(String(r.providerId)) && seen.add(String(r.providerId))).slice(0, limit);
    const artists = await Artist.find({ _id: { $in: picked.map((r) => r.providerId) } }).select("slug displayName").lean();
    const salons = await Salon.find({ _id: { $in: picked.map((r) => r.providerId) } }).select("slug name").lean();
    const names = new Map<string, { name: string; href: string }>([
      ...artists.map((a) => [String(a._id), { name: a.displayName, href: `/artists/${a.slug}` }] as const),
      ...salons.map((s) => [String(s._id), { name: s.name, href: `/salons/${s.slug}` }] as const),
    ]);
    return picked.flatMap((r) => {
      const p = names.get(String(r.providerId));
      return p ? [{ ...toReview(r), provider: p }] : [];
    });
  },

  /** Increment profile view counters (total + daily bucket for analytics). Fire-and-forget. */
  async recordProfileView(providerType: ProviderType, providerId: Types.ObjectId | string) {
    const model = providerType === "ARTIST" ? Artist : Salon;
    await Promise.all([
      (model as typeof Artist).updateOne({ _id: providerId }, { $inc: { profileViews: 1 } }),
      ProviderDailyStat.updateOne({ providerId, dateKey: todayKey() }, { $inc: { profileViews: 1 } }, { upsert: true }),
    ]);
  },
};

/** Attach public provider + category info to portfolio docs; drops looks whose provider isn't public. */
async function hydrateLooks(
  page: {
    _id: Types.ObjectId;
    providerType: string;
    providerId: Types.ObjectId;
    categoryId: Types.ObjectId;
    image: Parameters<typeof toLook>[0]["image"];
    title: string;
    description?: string | null;
    styleTags?: string[] | null;
    priceFrom?: number | null;
    serviceId?: Types.ObjectId | null;
  }[],
): Promise<LookDTO[]> {
  const artistIds = page.filter((d) => d.providerType === "ARTIST").map((d) => d.providerId);
  const salonIds = page.filter((d) => d.providerType === "SALON").map((d) => d.providerId);
  const [artists, salons, cats] = await Promise.all([
    artistIds.length
      ? Artist.find({ _id: { $in: artistIds }, ...PUBLIC_PROVIDER }).select("slug displayName avatar verificationStatus").lean()
      : [],
    salonIds.length
      ? Salon.find({ _id: { $in: salonIds }, ...PUBLIC_PROVIDER }).select("slug name logo verificationStatus").lean()
      : [],
    categoryMap([...new Set(page.map((d) => d.categoryId))]),
  ]);
  const providers = new Map<string, LookDTO["provider"]>();
  for (const a of artists) {
    providers.set(String(a._id), {
      id: String(a._id),
      type: "ARTIST",
      slug: a.slug,
      name: a.displayName,
      avatar: toImage(a.avatar),
      verified: a.verificationStatus === "VERIFIED",
    });
  }
  for (const s of salons) {
    providers.set(String(s._id), {
      id: String(s._id),
      type: "SALON",
      slug: s.slug,
      name: s.name,
      avatar: toImage(s.logo),
      verified: s.verificationStatus === "VERIFIED",
    });
  }
  return page.flatMap((d) => {
    const provider = providers.get(String(d.providerId));
    if (!provider) return [];
    const c = cats.get(String(d.categoryId));
    return [toLook(d, provider, c ? { slug: c.slug, name: c.name } : null)];
  });
}

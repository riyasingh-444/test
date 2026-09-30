import "server-only";
import type { Model, PipelineStage, Types } from "mongoose";
import { findCity } from "@/lib/catalog";
import type { ProviderType } from "@/lib/constants";
import { addDaysToKey, todayKey, weekdayOf, zonedInstant } from "@/lib/time";
import type { ProviderSearchParams } from "@/lib/validation/discovery";
import { Artist, Category, Salon } from "@/server/models";
import { toProviderCard } from "@/server/mappers";
import type { Paginated, ProviderCardDTO } from "@/types/dto";
import { heuristicRanking, type RankingStrategy } from "./ranking";
import type { SearchService } from "./types";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class MongoSearchService implements SearchService {
  constructor(private ranking: RankingStrategy = heuristicRanking) {}

  async searchProviders(type: ProviderType, p: ProviderSearchParams): Promise<Paginated<ProviderCardDTO>> {
    const model = (type === "ARTIST" ? Artist : Salon) as unknown as Model<unknown>;
    const nameField = type === "ARTIST" ? "displayName" : "name";
    const filter: Record<string, unknown> = { isActive: true, verificationStatus: { $ne: "REJECTED" } };
    const and: Record<string, unknown>[] = [];

    // Category / group
    const categoryIds = await this.resolveCategoryIds(p.category, p.group);
    if (categoryIds) filter.categoryIds = { $in: categoryIds };

    // Free text — regex over a few indexed-ish fields + matching category names.
    // (Kept geo-compatible; replace with Atlas Search / Algolia via SearchService for scale.)
    if (p.q) {
      const rx = new RegExp(escapeRegex(p.q), "i");
      const catMatches = await Category.find({ name: rx, isActive: true }).select("_id").lean();
      and.push({
        $or: [
          { [nameField]: rx },
          { headline: rx },
          { "location.area": rx },
          ...(type === "ARTIST" ? [{ styles: rx }] : [{ amenities: rx }]),
          ...(catMatches.length ? [{ categoryIds: { $in: catMatches.map((c) => c._id) } }] : []),
        ],
      });
    }

    const city = findCity(p.city);
    if (p.city && !(p.lat != null && p.lng != null)) {
      filter["location.city"] = city?.name ?? new RegExp(`^${escapeRegex(p.city)}$`, "i");
    }

    if (p.minPrice != null || p.maxPrice != null) {
      filter.startingPrice = {
        ...(p.minPrice != null ? { $gte: Math.round(p.minPrice * 100) } : {}),
        ...(p.maxPrice != null ? { $lte: Math.round(p.maxPrice * 100) } : {}),
      };
    }
    if (p.minRating != null) filter.ratingAvg = { $gte: p.minRating };
    if (p.minExperience != null && type === "ARTIST") filter.experienceYears = { $gte: p.minExperience };
    if (p.verified) filter.verificationStatus = "VERIFIED";
    if (p.mode) {
      if (type === "ARTIST") filter.serviceMode = { $in: [p.mode, "BOTH"] };
      else if (p.mode === "HOME") filter.offersHomeService = true;
    }
    if (and.length) filter.$and = and;

    const hasGeo = p.lat != null && p.lng != null;
    const pipeline: PipelineStage[] = hasGeo
      ? [
          {
            $geoNear: {
              near: { type: "Point", coordinates: [p.lng!, p.lat!] },
              distanceField: "distanceMeters",
              maxDistance: p.radiusKm * 1000,
              spherical: true,
              key: "location.point",
              query: filter,
            },
          },
        ]
      : [{ $match: filter }];

    if (p.available) pipeline.push(...this.availabilityStages(type, p.available));

    const sort = this.sortStage(p.sort, hasGeo);
    if (sort.score) pipeline.push(...this.ranking.scoreStages({ hasGeo }));
    pipeline.push({ $sort: sort.spec });

    pipeline.push({
      $facet: {
        items: [
          { $skip: (p.page - 1) * p.limit },
          { $limit: p.limit },
          {
            $lookup: {
              from: "categories",
              localField: "categoryIds",
              foreignField: "_id",
              as: "_cats",
              pipeline: [{ $sort: { sortOrder: 1 } }, { $project: { name: 1 } }],
            },
          },
          { $addFields: { categoryNames: { $slice: ["$_cats.name", 3] } } },
          { $project: { _cats: 0, bio: 0, description: 0, policies: 0, socialLinks: 0, userId: 0, ownerId: 0 } },
        ],
        total: [{ $count: "n" }],
      },
    });

    const [res] = await model.aggregate<{ items: Parameters<typeof toProviderCard>[0][]; total: { n: number }[] }>(pipeline);
    const total = res?.total[0]?.n ?? 0;
    return {
      items: (res?.items ?? []).map((doc) => toProviderCard(doc, type)),
      page: p.page,
      limit: p.limit,
      total,
      hasMore: p.page * p.limit < total,
    };
  }

  private async resolveCategoryIds(slug?: string, group?: string): Promise<Types.ObjectId[] | null> {
    if (!slug && !group) return null;
    const cats = await Category.find({ isActive: true, ...(slug ? { slug } : { group }) }).select("_id").lean();
    return cats.map((c) => c._id);
  }

  /**
   * "Available today / this week" = has working hours on at least one of those days that
   * isn't fully blocked. This is a day-level signal; exact free slots are shown on the profile.
   */
  private availabilityStages(type: ProviderType, window: "today" | "week"): PipelineStage[] {
    const start = todayKey();
    const days = window === "today" ? [start] : Array.from({ length: 7 }, (_, i) => addDaysToKey(start, i));
    return [
      {
        $lookup: {
          from: "availability",
          let: { pid: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$providerId", "$$pid"] }, { $eq: ["$providerType", type] }] } } },
            { $project: { weeklyHours: 1, blocks: 1 } },
          ],
          as: "_avail",
        },
      },
      {
        $match: {
          $or: days.map((dk) => ({
            _avail: {
              $elemMatch: {
                weeklyHours: { $elemMatch: { day: weekdayOf(dk), isOpen: true } },
                blocks: {
                  $not: {
                    $elemMatch: {
                      startAt: { $lte: zonedInstant(dk, "00:00") },
                      endAt: { $gte: zonedInstant(addDaysToKey(dk, 1), "00:00") },
                    },
                  },
                },
              },
            },
          })),
        },
      },
      { $project: { _avail: 0 } },
    ];
  }

  private sortStage(sort: ProviderSearchParams["sort"], hasGeo: boolean): { spec: Record<string, 1 | -1>; score?: boolean } {
    switch (sort) {
      case "nearest":
        return hasGeo ? { spec: { distanceMeters: 1, _id: 1 } } : { spec: { _score: -1, _id: 1 }, score: true };
      case "rating":
        return { spec: { ratingAvg: -1, reviewCount: -1, _id: 1 } };
      case "price_asc":
        return { spec: { startingPrice: 1, _id: 1 } };
      case "price_desc":
        return { spec: { startingPrice: -1, _id: 1 } };
      case "popular":
        return { spec: { bookingCount: -1, _id: 1 } };
      default:
        return { spec: { _score: -1, _id: 1 }, score: true };
    }
  }
}

export const searchService: MongoSearchService = new MongoSearchService();

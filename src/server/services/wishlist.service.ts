import "server-only";
import { Types } from "mongoose";
import type { WishlistTarget } from "@/lib/constants";
import type { AuthUser } from "@/server/auth/current-user";
import { errors } from "@/server/http/errors";
import { toProviderCard } from "@/server/mappers";
import { Artist, PortfolioItem, Salon, WishlistItem } from "@/server/models";
import type { Paginated, WishlistItemDTO } from "@/types/dto";
import { discoveryService } from "./discovery.service";

async function targetExists(type: WishlistTarget, id: string) {
  if (type === "ARTIST") return Boolean(await Artist.exists({ _id: id, isActive: true }));
  if (type === "SALON") return Boolean(await Salon.exists({ _id: id, isActive: true }));
  return Boolean(await PortfolioItem.exists({ _id: id, isActive: true }));
}

export const wishlistService = {
  /** Idempotent save. */
  async add(user: AuthUser, targetType: WishlistTarget, targetId: string) {
    if (!(await targetExists(targetType, targetId))) throw errors.notFound("Item");
    const res = await WishlistItem.findOneAndUpdate(
      { userId: user.id, targetType, targetId },
      { $setOnInsert: { userId: user.id, targetType, targetId } },
      { upsert: true, returnDocument: "after", includeResultMetadata: true },
    );
    if (targetType === "LOOK" && !res.lastErrorObject?.updatedExisting) {
      await PortfolioItem.updateOne({ _id: targetId }, { $inc: { saveCount: 1 } });
    }
    return { id: String(res.value!._id), targetType, targetId, saved: true };
  },

  async remove(user: AuthUser, by: { id?: string; targetType?: WishlistTarget; targetId?: string }) {
    const filter = by.id
      ? { _id: by.id, userId: user.id }
      : { userId: user.id, targetType: by.targetType, targetId: by.targetId };
    const removed = await WishlistItem.findOneAndDelete(filter).lean();
    if (!removed) throw errors.notFound("Saved item");
    if (removed.targetType === "LOOK") await PortfolioItem.updateOne({ _id: removed.targetId, saveCount: { $gt: 0 } }, { $inc: { saveCount: -1 } });
    return { removed: true };
  },

  /** Saved target ids for rendering heart states. */
  async savedIds(user: AuthUser, targetType?: WishlistTarget) {
    const items = await WishlistItem.find({ userId: user.id, ...(targetType ? { targetType } : {}) })
      .select("targetType targetId")
      .limit(2000)
      .lean();
    return items.map((i) => ({ targetType: i.targetType, targetId: String(i.targetId) }));
  },

  async list(user: AuthUser, q: { type?: WishlistTarget; page: number; limit: number }): Promise<Paginated<WishlistItemDTO>> {
    const filter = { userId: new Types.ObjectId(user.id), ...(q.type ? { targetType: q.type } : {}) };
    const [items, total] = await Promise.all([
      WishlistItem.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
      WishlistItem.countDocuments(filter),
    ]);
    const ids = (t: WishlistTarget) => items.filter((i) => i.targetType === t).map((i) => i.targetId);
    const [artists, salons, looks] = await Promise.all([
      Artist.find({ _id: { $in: ids("ARTIST") } }).lean(),
      Salon.find({ _id: { $in: ids("SALON") } }).lean(),
      Promise.all(ids("LOOK").map((id) => discoveryService.getLook(String(id)).catch(() => null))),
    ]);
    const artistMap = new Map(artists.map((a) => [String(a._id), toProviderCard(a, "ARTIST")]));
    const salonMap = new Map(salons.map((s) => [String(s._id), toProviderCard(s, "SALON")]));
    const lookMap = new Map(looks.filter((l) => l !== null).map((l) => [l.id, l]));
    return {
      items: items.map((i) => ({
        id: String(i._id),
        targetType: i.targetType,
        targetId: String(i.targetId),
        createdAt: i.createdAt.toISOString(),
        provider: i.targetType === "ARTIST" ? artistMap.get(String(i.targetId)) ?? null : i.targetType === "SALON" ? salonMap.get(String(i.targetId)) ?? null : null,
        look: i.targetType === "LOOK" ? lookMap.get(String(i.targetId)) ?? null : null,
      })),
      page: q.page,
      limit: q.limit,
      total,
      hasMore: q.page * q.limit < total,
    };
  },
};

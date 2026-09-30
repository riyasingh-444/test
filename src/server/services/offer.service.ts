import "server-only";
import type { ClientSession, Types } from "mongoose";
import type { ProviderType } from "@/lib/constants";
import { errors } from "@/server/http/errors";
import { Offer, type OfferDoc } from "@/server/models";

export function computeDiscount(offer: Pick<OfferDoc, "discountType" | "discountValue" | "maxDiscount">, subtotal: number) {
  const raw = offer.discountType === "PERCENT" ? Math.floor((subtotal * offer.discountValue) / 100) : offer.discountValue;
  const capped = offer.maxDiscount ? Math.min(raw, offer.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, subtotal));
}

export const offerService = {
  /** Validate a code for a booking and atomically reserve one use. */
  async redeem(
    code: string,
    ctx: { providerType: ProviderType; providerId: Types.ObjectId; categoryId: Types.ObjectId; subtotal: number },
    session?: ClientSession,
  ) {
    const now = new Date();
    const offer = await Offer.findOne({ code: code.toUpperCase(), isActive: true, startsAt: { $lte: now }, endsAt: { $gte: now } })
      .session(session ?? null)
      .lean();
    if (!offer) throw errors.validation({ offerCode: ["This offer code isn't valid"] });
    if (offer.scope === "PROVIDER" && String(offer.providerId) !== String(ctx.providerId)) {
      throw errors.validation({ offerCode: ["This offer isn't valid for this professional"] });
    }
    if (offer.categoryIds?.length && !offer.categoryIds.some((c) => String(c) === String(ctx.categoryId))) {
      throw errors.validation({ offerCode: ["This offer isn't valid for this service"] });
    }
    if (ctx.subtotal < (offer.minOrderValue ?? 0)) {
      throw errors.validation({ offerCode: ["Order value is below this offer's minimum"] });
    }
    const res = await Offer.updateOne(
      {
        _id: offer._id,
        $or: [{ usageLimit: null }, { usageLimit: { $exists: false } }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }],
      },
      { $inc: { usedCount: 1 } },
      { session },
    );
    if (res.modifiedCount !== 1) throw errors.validation({ offerCode: ["This offer has been fully redeemed"] });
    return { code: offer.code!, discount: computeDiscount(offer, ctx.subtotal) };
  },

  async listActive(limit = 12) {
    const now = new Date();
    const offers = await Offer.find({ isActive: true, startsAt: { $lte: now }, endsAt: { $gte: now } })
      .sort({ endsAt: 1 })
      .limit(limit)
      .lean();
    return offers.map((o) => ({
      id: String(o._id),
      title: o.title,
      subtitle: o.subtitle ?? null,
      code: o.code ?? null,
      discountType: o.discountType,
      discountValue: o.discountValue,
      maxDiscount: o.maxDiscount ?? null,
      minOrderValue: o.minOrderValue ?? 0,
      endsAt: o.endsAt.toISOString(),
      image: o.image?.url ? { url: o.image.url } : null,
      isDemo: o.isDemo ?? false,
    }));
  },
};

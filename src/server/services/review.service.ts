import "server-only";
import { Types } from "mongoose";
import type { ProviderType } from "@/lib/constants";
import type { CreateReviewInput } from "@/lib/validation/engagement";
import type { AuthUser } from "@/server/auth/current-user";
import { withTransaction } from "@/server/db/transactions";
import { errors } from "@/server/http/errors";
import { toReview } from "@/server/mappers";
import { Artist, Booking, Review, Salon, User } from "@/server/models";
import { notificationService } from "@/server/notifications";
import type { ReviewDTO } from "@/types/dto";
import { getOwnedProvider, loadProvider } from "./provider-access";

/** Recompute denormalised rating aggregates from published reviews. */
export async function refreshProviderRating(providerType: ProviderType, providerId: Types.ObjectId) {
  const [agg] = await Review.aggregate<{ avg: number; n: number }>([
    { $match: { providerId, status: "PUBLISHED" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } },
  ]);
  const model = (providerType === "ARTIST" ? Artist : Salon) as typeof Artist;
  await model.updateOne(
    { _id: providerId },
    { $set: { ratingAvg: agg ? Math.round(agg.avg * 100) / 100 : 0, reviewCount: agg?.n ?? 0 } },
  );
}

export const reviewService = {
  /** Only the customer of a COMPLETED booking may review it, once. */
  async create(user: AuthUser, input: CreateReviewInput): Promise<ReviewDTO> {
    const booking = await Booking.findById(input.bookingId).lean();
    if (!booking || String(booking.customerId) !== user.id) throw errors.notFound("Booking");
    if (booking.status !== "COMPLETED") throw errors.conflict("You can review a booking once it's completed");
    if (booking.reviewId) throw errors.conflict("You've already reviewed this booking");

    const customer = await User.findById(user.id).select("name").lean();
    const review = await withTransaction(async (session) => {
      const [r] = await Review.create(
        [
          {
            bookingId: booking._id,
            customerId: booking.customerId,
            providerType: booking.providerType,
            providerId: booking.providerId,
            serviceId: booking.serviceId,
            serviceName: booking.serviceSnapshot.name,
            customerName: customer?.name ?? "Customer",
            rating: input.rating,
            comment: input.comment,
            images: input.images,
            verified: true,
          },
        ],
        { session },
      );
      const res = await Booking.updateOne({ _id: booking._id, reviewId: null }, { $set: { reviewId: r!._id } }, { session });
      if (res.modifiedCount !== 1) throw errors.conflict("You've already reviewed this booking");
      return r!;
    });

    await refreshProviderRating(booking.providerType, booking.providerId);
    const provider = await loadProvider(booking.providerType, booking.providerId);
    await notificationService.notify(provider.ownerUserId, {
      type: "NEW_REVIEW",
      title: `New ${input.rating}★ review`,
      body: input.comment ? input.comment.slice(0, 140) : `For ${booking.serviceSnapshot.name}`,
      link: "/partner/reviews",
    });
    return toReview(review.toObject());
  },

  async listMine(user: AuthUser, page: number, limit: number) {
    const filter = { customerId: new Types.ObjectId(user.id) };
    const [items, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Review.countDocuments(filter),
    ]);
    return { items: items.map((r) => ({ ...toReview(r), providerId: String(r.providerId), providerType: r.providerType })), page, limit, total, hasMore: page * limit < total };
  },

  async reply(user: AuthUser, reviewId: string, text: string): Promise<ReviewDTO> {
    const provider = await getOwnedProvider(user);
    const review = await Review.findOneAndUpdate(
      { _id: reviewId, providerId: provider.id },
      { $set: { reply: { text, at: new Date() } } },
      { returnDocument: "after" },
    ).lean();
    if (!review) throw errors.notFound("Review");
    return toReview(review);
  },

  /** Admin moderation. Hidden reviews are excluded from ratings. */
  async setStatus(reviewId: string, status: "PUBLISHED" | "HIDDEN") {
    const review = await Review.findByIdAndUpdate(reviewId, { $set: { status } }, { returnDocument: "after" }).lean();
    if (!review) throw errors.notFound("Review");
    await refreshProviderRating(review.providerType, review.providerId);
    return toReview(review);
  },
};

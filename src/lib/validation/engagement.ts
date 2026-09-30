import { z } from "zod";
import { WISHLIST_TARGETS } from "@/lib/constants";
import { objectId, pageQuery } from "./common";

/** Ownership of the asset (our cloud + the user's folder) is re-checked server-side in the service. */
export const reviewImageSchema = z.object({
  url: z.url().refine((u) => u.startsWith("https://res.cloudinary.com/"), "Images must be uploaded via Rivya"),
  publicId: z.string().max(200).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const createReviewSchema = z.object({
  bookingId: objectId,
  rating: z.number().int().min(1, "Choose a rating").max(5),
  comment: z.string().trim().max(2000).optional(),
  images: z.array(reviewImageSchema).max(6).default([]),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const reviewListSchema = pageQuery.extend({
  providerId: objectId.optional(),
  mine: z.enum(["true", "false"]).optional(),
});

export const reviewReplySchema = z.object({ text: z.string().trim().min(2).max(1000) });

export const wishlistAddSchema = z.object({ targetType: z.enum(WISHLIST_TARGETS), targetId: objectId });
export const wishlistListSchema = pageQuery.extend({ type: z.enum(WISHLIST_TARGETS).optional() });

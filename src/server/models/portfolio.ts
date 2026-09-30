import { Schema, type InferSchemaType, type Types } from "mongoose";
import { PROVIDER_TYPES } from "@/lib/constants";
import { defineModel } from "./define";
import { demoField, imageSchema } from "./shared";

/**
 * A "look" — one portfolio image. Looks are the primary discovery surface:
 * the Explore Looks feed, the artist portfolio grid, and look-based wishlists.
 */
const portfolioSchema = new Schema(
  {
    providerType: { type: String, enum: PROVIDER_TYPES, required: true, default: "ARTIST" },
    providerId: { type: Schema.Types.ObjectId, required: true },
    image: { type: imageSchema, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 600 },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    styleTags: { type: [String], default: [] }, // e.g. "natural", "glam", "traditional"
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", default: null },
    priceFrom: { type: Number, min: 0 }, // paise, optional display price
    city: { type: String, trim: true },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    saveCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    ...demoField,
  },
  { timestamps: true },
);

portfolioSchema.index({ providerType: 1, providerId: 1, createdAt: -1 });
portfolioSchema.index({ isActive: 1, categoryId: 1, createdAt: -1 });
portfolioSchema.index({ isActive: 1, styleTags: 1, createdAt: -1 });
portfolioSchema.index({ isActive: 1, city: 1, createdAt: -1 });

export type PortfolioDoc = InferSchemaType<typeof portfolioSchema> & { _id: Types.ObjectId };
export const PortfolioItem = defineModel("PortfolioItem", portfolioSchema, "portfolios");

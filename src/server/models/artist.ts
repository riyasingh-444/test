import { Schema, type InferSchemaType, type Types } from "mongoose";
import { SERVICE_MODES, VERIFICATION_STATUSES } from "@/lib/constants";
import { defineModel } from "./define";
import { demoField, imageSchema, placeSchema, socialLinksSchema } from "./shared";

/**
 * Artist (individual beauty professional) profile. One per ARTIST user.
 * Rating/booking aggregates and `startingPrice` are denormalised for fast discovery
 * and kept in sync by the review / booking / service services.
 */
const artistSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    headline: { type: String, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 2000 },
    experienceYears: { type: Number, min: 0, max: 60, default: 0 },
    languages: { type: [String], default: [] },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    styles: { type: [String], default: [] },
    location: { type: placeSchema, required: true },
    serviceMode: { type: String, enum: SERVICE_MODES, default: "BOTH" },
    serviceRadiusKm: { type: Number, min: 0, max: 200, default: 15 },
    avatar: imageSchema,
    cover: imageSchema,
    socialLinks: socialLinksSchema,
    salonId: { type: Schema.Types.ObjectId, ref: "Salon", default: null },
    policies: {
      cancellation: { type: String, trim: true, maxlength: 1000 },
      advancePercent: { type: Number, min: 0, max: 100, default: 100 },
      travelNote: { type: String, trim: true, maxlength: 500 },
    },
    startingPrice: { type: Number, min: 0, default: 0 }, // paise
    ratingAvg: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    bookingCount: { type: Number, min: 0, default: 0 },
    profileViews: { type: Number, min: 0, default: 0 },
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: "PENDING" },
    isActive: { type: Boolean, default: true },
    onboardingStep: { type: Number, default: 0 },
    ...demoField,
  },
  { timestamps: true },
);

artistSchema.index({ "location.point": "2dsphere" });
artistSchema.index({ isActive: 1, categoryIds: 1, ratingAvg: -1 });
artistSchema.index({ isActive: 1, "location.city": 1, ratingAvg: -1 });
artistSchema.index({ isActive: 1, startingPrice: 1 });
artistSchema.index({ isActive: 1, bookingCount: -1 });
artistSchema.index({ verificationStatus: 1, createdAt: -1 });
artistSchema.index(
  { displayName: "text", headline: "text", bio: "text", styles: "text", "location.area": "text" },
  { weights: { displayName: 10, headline: 5, styles: 4, "location.area": 3, bio: 1 }, name: "artist_text" },
);

export type ArtistDoc = InferSchemaType<typeof artistSchema> & { _id: Types.ObjectId };
export const Artist = defineModel("Artist", artistSchema, "artists");

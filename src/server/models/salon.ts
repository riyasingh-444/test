import { Schema, type InferSchemaType, type Types } from "mongoose";
import { VERIFICATION_STATUSES } from "@/lib/constants";
import { defineModel } from "./define";
import { demoField, imageSchema, placeSchema, socialLinksSchema, weeklyHoursSchema } from "./shared";

const salonSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    headline: { type: String, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 3000 },
    contactPhone: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    location: { type: placeSchema, required: true },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    images: { type: [imageSchema], default: [] },
    cover: imageSchema,
    logo: imageSchema,
    openingHours: { type: [weeklyHoursSchema], default: [] },
    amenities: { type: [String], default: [] },
    staffArtistIds: [{ type: Schema.Types.ObjectId, ref: "Artist" }],
    socialLinks: socialLinksSchema,
    offersHomeService: { type: Boolean, default: false },
    startingPrice: { type: Number, min: 0, default: 0 }, // paise
    ratingAvg: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    bookingCount: { type: Number, min: 0, default: 0 },
    profileViews: { type: Number, min: 0, default: 0 },
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: "PENDING" },
    isActive: { type: Boolean, default: true },
    ...demoField,
  },
  { timestamps: true },
);

salonSchema.index({ "location.point": "2dsphere" });
salonSchema.index({ isActive: 1, categoryIds: 1, ratingAvg: -1 });
salonSchema.index({ isActive: 1, "location.city": 1, ratingAvg: -1 });
salonSchema.index({ isActive: 1, startingPrice: 1 });
salonSchema.index({ verificationStatus: 1, createdAt: -1 });
salonSchema.index(
  { name: "text", headline: "text", description: "text", amenities: "text", "location.area": "text" },
  { weights: { name: 10, headline: 5, "location.area": 3, amenities: 2, description: 1 }, name: "salon_text" },
);

export type SalonDoc = InferSchemaType<typeof salonSchema> & { _id: Types.ObjectId };
export const Salon = defineModel("Salon", salonSchema, "salons");

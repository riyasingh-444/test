import { Schema, type InferSchemaType, type Types } from "mongoose";
import { PROVIDER_TYPES } from "@/lib/constants";
import { defineModel } from "./define";
import { demoField, imageSchema } from "./shared";

/** Reviews can only be created from a COMPLETED booking, so every review is a verified booking. */
const reviewSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    providerType: { type: String, enum: PROVIDER_TYPES, required: true },
    providerId: { type: Schema.Types.ObjectId, required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    serviceName: String,
    customerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 2000 },
    images: { type: [imageSchema], default: [] },
    verified: { type: Boolean, default: true },
    status: { type: String, enum: ["PUBLISHED", "HIDDEN"], default: "PUBLISHED" },
    reply: {
      text: { type: String, trim: true, maxlength: 1000 },
      at: Date,
    },
    ...demoField,
  },
  { timestamps: true },
);
reviewSchema.index({ providerId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });

export type ReviewDoc = InferSchemaType<typeof reviewSchema> & { _id: Types.ObjectId };
export const Review = defineModel("Review", reviewSchema, "reviews");

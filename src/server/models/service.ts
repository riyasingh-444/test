import { Schema, type InferSchemaType, type Types } from "mongoose";
import { PROVIDER_TYPES, SERVICE_MODES } from "@/lib/constants";
import { defineModel } from "./define";
import { demoField } from "./shared";

/** A bookable service offered by an artist or a salon. Prices in paise. */
const serviceSchema = new Schema(
  {
    providerType: { type: String, enum: PROVIDER_TYPES, required: true },
    providerId: { type: Schema.Types.ObjectId, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1500 },
    includes: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0 },
    priceType: { type: String, enum: ["FIXED", "STARTING_AT"], default: "FIXED" },
    durationMin: { type: Number, required: true, min: 15, max: 12 * 60 },
    bufferMin: { type: Number, min: 0, max: 240, default: 15 },
    serviceMode: { type: String, enum: SERVICE_MODES, default: "BOTH" },
    homeServiceFee: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    ...demoField,
  },
  { timestamps: true },
);

serviceSchema.index({ providerType: 1, providerId: 1, isActive: 1, sortOrder: 1 });
serviceSchema.index({ categoryId: 1, isActive: 1, price: 1 });

export type ServiceDoc = InferSchemaType<typeof serviceSchema> & { _id: Types.ObjectId };
export const Service = defineModel("Service", serviceSchema, "services");

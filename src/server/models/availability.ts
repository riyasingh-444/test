import { Schema, type InferSchemaType, type Types } from "mongoose";
import { DEFAULT_TIMEZONE, PROVIDER_TYPES } from "@/lib/constants";
import { defineModel } from "./define";
import { weeklyHoursSchema } from "./shared";

const blockSchema = new Schema({
  kind: { type: String, enum: ["TIME_OFF", "HOLIDAY", "BLOCKED"], default: "BLOCKED" },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  note: { type: String, trim: true, maxlength: 200 },
});

/** One availability document per provider: weekly working hours + explicit blocks. */
const availabilitySchema = new Schema(
  {
    providerType: { type: String, enum: PROVIDER_TYPES, required: true },
    providerId: { type: Schema.Types.ObjectId, required: true },
    timezone: { type: String, default: DEFAULT_TIMEZONE },
    weeklyHours: { type: [weeklyHoursSchema], default: [] },
    blocks: { type: [blockSchema], default: [] },
    /** Minimum notice (minutes) before a booking can start. */
    minNoticeMin: { type: Number, min: 0, default: 120 },
    /** Parallel capacity — salons with several chairs can take concurrent bookings. */
    capacity: { type: Number, min: 1, max: 50, default: 1 },
  },
  { timestamps: true },
);
availabilitySchema.index({ providerType: 1, providerId: 1 }, { unique: true });
availabilitySchema.index({ providerId: 1, "blocks.startAt": 1 });

export type AvailabilityDoc = InferSchemaType<typeof availabilitySchema> & { _id: Types.ObjectId };
export const Availability = defineModel("Availability", availabilitySchema, "availability");

/**
 * Per-provider-per-day lock document. Booking transactions increment `version`,
 * which makes concurrent transactions for the same provider/day conflict so only one commits.
 */
const scheduleLockSchema = new Schema({
  providerId: { type: Schema.Types.ObjectId, required: true },
  dateKey: { type: String, required: true }, // YYYY-MM-DD in provider timezone
  version: { type: Number, default: 0 },
});
scheduleLockSchema.index({ providerId: 1, dateKey: 1 }, { unique: true });

export const ScheduleLock = defineModel("ScheduleLock", scheduleLockSchema, "scheduleLocks");

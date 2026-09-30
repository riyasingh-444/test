import { Schema, type InferSchemaType, type Types } from "mongoose";
import { BOOKING_MODES, BOOKING_STATUSES, PAYMENT_STATUSES, PROVIDER_TYPES, ROLES } from "@/lib/constants";
import { defineModel } from "./define";
import { demoField, pointSchema } from "./shared";

const statusEventSchema = new Schema(
  {
    status: { type: String, enum: BOOKING_STATUSES, required: true },
    at: { type: Date, default: () => new Date() },
    byUserId: { type: Schema.Types.ObjectId, ref: "User" },
    byRole: { type: String, enum: [...ROLES, "SYSTEM"] },
    note: { type: String, maxlength: 500 },
  },
  { _id: false },
);

const bookingSchema = new Schema(
  {
    code: { type: String, required: true, unique: true }, // human-friendly reference, e.g. RV-7K2M9Q
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    providerType: { type: String, enum: PROVIDER_TYPES, required: true },
    providerId: { type: Schema.Types.ObjectId, required: true },
    /** Salon bookings may be assigned to a specific staff artist. */
    staffArtistId: { type: Schema.Types.ObjectId, ref: "Artist", default: null },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    /** Immutable copy of what was booked, so later price edits don't rewrite history. */
    serviceSnapshot: {
      name: { type: String, required: true },
      durationMin: { type: Number, required: true },
      bufferMin: { type: Number, default: 0 },
      price: { type: Number, required: true },
    },
    providerSnapshot: {
      name: { type: String, required: true },
      slug: { type: String, required: true },
    },
    dateKey: { type: String, required: true }, // YYYY-MM-DD in provider timezone
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    /** endAt + buffer — the calendar is occupied until this instant. */
    blockedUntil: { type: Date, required: true },
    mode: { type: String, enum: BOOKING_MODES, required: true },
    address: {
      line1: String,
      line2: String,
      landmark: String,
      city: String,
      pincode: String,
      point: pointSchema,
    },
    customerNote: { type: String, trim: true, maxlength: 1000 },
    pricing: {
      subtotal: { type: Number, required: true },
      homeServiceFee: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
      total: { type: Number, required: true },
      commission: { type: Number, default: 0 }, // platform's share of total
      currency: { type: String, default: "INR" },
    },
    offerCode: String,
    status: { type: String, enum: BOOKING_STATUSES, default: "PENDING", required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "PENDING", required: true },
    /** Unpaid PENDING bookings release their slot after this instant. */
    holdExpiresAt: Date,
    statusHistory: { type: [statusEventSchema], default: [] },
    cancellation: {
      byRole: { type: String, enum: [...ROLES, "SYSTEM"] },
      reason: String,
      at: Date,
    },
    reviewId: { type: Schema.Types.ObjectId, ref: "Review", default: null },
    reminderSentAt: Date,
    ...demoField,
  },
  { timestamps: true },
);

bookingSchema.index({ providerId: 1, startAt: 1 });
bookingSchema.index({ providerId: 1, dateKey: 1, status: 1 });
bookingSchema.index({ customerId: 1, startAt: -1 });
bookingSchema.index({ status: 1, holdExpiresAt: 1 });
bookingSchema.index({ status: 1, startAt: 1, reminderSentAt: 1 });
bookingSchema.index({ createdAt: -1 });

export type BookingDoc = InferSchemaType<typeof bookingSchema> & { _id: Types.ObjectId };
export const Booking = defineModel("Booking", bookingSchema, "bookings");

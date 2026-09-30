import { Schema, type InferSchemaType, type Types } from "mongoose";
import { PAYMENT_STATUSES } from "@/lib/constants";
import { defineModel } from "./define";

const paymentSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: ["RAZORPAY", "STRIPE"], required: true },
    providerOrderId: { type: String, required: true, unique: true },
    providerPaymentId: { type: String },
    amount: { type: Number, required: true }, // paise
    currency: { type: String, default: "INR" },
    status: { type: String, enum: PAYMENT_STATUSES, default: "PENDING", required: true },
    failureReason: String,
    method: String,
    paidAt: Date,
    refund: {
      providerRefundId: String,
      amount: Number,
      at: Date,
      reason: String,
    },
    /** Webhook event ids already processed — makes webhook handling idempotent. */
    processedEventIds: { type: [String], default: [] },
  },
  { timestamps: true },
);
paymentSchema.index({ providerPaymentId: 1 }, { sparse: true });
paymentSchema.index({ status: 1, createdAt: -1 });

export type PaymentDoc = InferSchemaType<typeof paymentSchema> & { _id: Types.ObjectId };
export const Payment = defineModel("Payment", paymentSchema, "payments");

import { Schema, type InferSchemaType, type Types } from "mongoose";
import { PROVIDER_TYPES, VERIFICATION_STATUSES } from "@/lib/constants";
import { defineModel } from "./define";
import { demoField, imageSchema } from "./shared";

/* ── Offers ───────────────────────────────────────────────── */
const offerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    subtitle: { type: String, trim: true, maxlength: 240 },
    code: { type: String, uppercase: true, trim: true },
    discountType: { type: String, enum: ["PERCENT", "FLAT"], required: true },
    discountValue: { type: Number, required: true, min: 0 }, // percent or paise
    maxDiscount: { type: Number, min: 0 }, // paise cap for percent offers
    minOrderValue: { type: Number, min: 0, default: 0 },
    scope: { type: String, enum: ["PLATFORM", "PROVIDER"], default: "PLATFORM" },
    providerType: { type: String, enum: PROVIDER_TYPES },
    providerId: { type: Schema.Types.ObjectId },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    image: imageSchema,
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    usageLimit: Number,
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    ...demoField,
  },
  { timestamps: true },
);
offerSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { code: { $type: "string" } } });
offerSchema.index({ isActive: 1, endsAt: 1 });
offerSchema.index({ providerId: 1, isActive: 1 });

export type OfferDoc = InferSchemaType<typeof offerSchema> & { _id: Types.ObjectId };
export const Offer = defineModel("Offer", offerSchema, "offers");

/* ── Verification requests ────────────────────────────────── */
const documentSchema = new Schema(
  {
    kind: { type: String, enum: ["ID_PROOF", "ADDRESS_PROOF", "CERTIFICATE", "BUSINESS_REGISTRATION", "GST", "OTHER"] },
    publicId: { type: String, required: true }, // private Cloudinary asset — never exposed publicly
    format: String,
    uploadedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const verificationSchema = new Schema(
  {
    providerType: { type: String, enum: PROVIDER_TYPES, required: true },
    providerId: { type: Schema.Types.ObjectId, required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    documents: { type: [documentSchema], default: [] },
    status: { type: String, enum: VERIFICATION_STATUSES, default: "PENDING" },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User" },
    reviewerNotes: { type: String, maxlength: 1000 },
    decidedAt: Date,
  },
  { timestamps: true },
);
verificationSchema.index({ status: 1, createdAt: 1 });
verificationSchema.index({ providerId: 1, createdAt: -1 });

export const VerificationRequest = defineModel("VerificationRequest", verificationSchema, "verificationRequests");

/* ── Payout details (sensitive; select:false) ─────────────── */
const payoutSchema = new Schema(
  {
    providerType: { type: String, enum: PROVIDER_TYPES, required: true },
    providerId: { type: Schema.Types.ObjectId, required: true, unique: true },
    accountHolder: { type: String, select: false },
    accountNumberLast4: String,
    accountNumberEncrypted: { type: String, select: false },
    ifsc: { type: String, select: false },
    upiId: { type: String, select: false },
  },
  { timestamps: true },
);
export const PayoutAccount = defineModel("PayoutAccount", payoutSchema, "payoutAccounts");

/* ── Support tickets ──────────────────────────────────────── */
const ticketSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    subject: { type: String, required: true, maxlength: 160 },
    body: { type: String, required: true, maxlength: 4000 },
    status: { type: String, enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"], default: "OPEN" },
    priority: { type: String, enum: ["LOW", "NORMAL", "HIGH"], default: "NORMAL" },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);
ticketSchema.index({ status: 1, createdAt: -1 });
export const SupportTicket = defineModel("SupportTicket", ticketSchema, "supportTickets");

/* ── Daily analytics counters ─────────────────────────────── */
const dailyStatSchema = new Schema({
  providerId: { type: Schema.Types.ObjectId, required: true },
  dateKey: { type: String, required: true },
  profileViews: { type: Number, default: 0 },
  portfolioViews: { type: Number, default: 0 },
});
dailyStatSchema.index({ providerId: 1, dateKey: 1 }, { unique: true });
export const ProviderDailyStat = defineModel("ProviderDailyStat", dailyStatSchema, "providerDailyStats");

/* ── Admin audit log ──────────────────────────────────────── */
const auditSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: Schema.Types.ObjectId,
    meta: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
auditSchema.index({ createdAt: -1 });
export const AuditLog = defineModel("AuditLog", auditSchema, "auditLogs");

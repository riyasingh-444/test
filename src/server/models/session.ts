import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel } from "./define";

/** Refresh-token sessions. Only a SHA-256 hash of the token is stored. */
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    userAgent: { type: String, maxlength: 300 },
    ip: String,
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    replacedBy: String,
  },
  { timestamps: true },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = InferSchemaType<typeof sessionSchema> & { _id: Types.ObjectId };
export const Session = defineModel("Session", sessionSchema, "sessions");

/** One-time phone codes (hashed). TTL-expired automatically. */
const otpSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpCode = defineModel("OtpCode", otpSchema, "otpCodes");

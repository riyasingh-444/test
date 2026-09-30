import { Schema, type InferSchemaType, type Types } from "mongoose";
import { ROLES } from "@/lib/constants";
import { defineModel } from "./define";
import { demoField, pointSchema } from "./shared";

const addressSchema = new Schema({
  label: { type: String, trim: true, maxlength: 40, default: "Home" },
  line1: { type: String, required: true, trim: true, maxlength: 200 },
  line2: { type: String, trim: true, maxlength: 200 },
  landmark: { type: String, trim: true, maxlength: 120 },
  city: { type: String, required: true, trim: true },
  pincode: { type: String, trim: true, match: /^\d{6}$/ },
  point: { type: pointSchema },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ROLES, default: "CUSTOMER", required: true },
    googleId: { type: String, select: false },
    avatarUrl: String,
    emailVerifiedAt: Date,
    phoneVerifiedAt: Date,
    defaultCity: { type: String, trim: true },
    addresses: { type: [addressSchema], default: [] },
    status: { type: String, enum: ["ACTIVE", "SUSPENDED", "DELETED"], default: "ACTIVE" },
    lastLoginAt: Date,
    notificationPrefs: {
      email: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
    },
    ...demoField,
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: "string" } } });
userSchema.index({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: "string" } } });
userSchema.index({ role: 1, createdAt: -1 });

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export const User = defineModel("User", userSchema, "users");

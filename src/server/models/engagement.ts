import { Schema, type InferSchemaType, type Types } from "mongoose";
import { NOTIFICATION_TYPES, WISHLIST_TARGETS } from "@/lib/constants";
import { defineModel } from "./define";

/* ── Wishlist ─────────────────────────────────────────────── */
const wishlistSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: WISHLIST_TARGETS, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);
wishlistSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
wishlistSchema.index({ userId: 1, createdAt: -1 });

export type WishlistDoc = InferSchemaType<typeof wishlistSchema> & { _id: Types.ObjectId };
export const WishlistItem = defineModel("WishlistItem", wishlistSchema, "wishlist");

/* ── Notifications ────────────────────────────────────────── */
const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, maxlength: 600 },
    link: String,
    data: { type: Schema.Types.Mixed },
    readAt: { type: Date, default: null },
    channels: { type: [String], default: ["IN_APP"] },
  },
  { timestamps: true },
);
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema> & { _id: Types.ObjectId };
export const Notification = defineModel("Notification", notificationSchema, "notifications");

/* ── Chat ─────────────────────────────────────────────────── */
const conversationSchema = new Schema(
  {
    participantIds: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
    lastMessage: { text: String, senderId: Schema.Types.ObjectId, at: Date },
    unread: { type: Map, of: Number, default: {} }, // userId -> unread count
  },
  { timestamps: true },
);
conversationSchema.index({ participantIds: 1, updatedAt: -1 });

export const Conversation = defineModel("Conversation", conversationSchema, "conversations");

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    bookingRef: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
  },
  { timestamps: true },
);
messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = defineModel("Message", messageSchema, "messages");

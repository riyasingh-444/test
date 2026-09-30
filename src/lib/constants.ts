/**
 * Domain constants shared by client and server.
 * Enumerations are `as const` tuples so they can back both TS types and zod/mongoose enums.
 */

export const ROLES = ["CUSTOMER", "ARTIST", "SALON", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];
export const PARTNER_ROLES: readonly Role[] = ["ARTIST", "SALON"];

export const PROVIDER_TYPES = ["ARTIST", "SALON"] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const SERVICE_MODES = ["HOME", "STUDIO", "BOTH"] as const;
export type ServiceMode = (typeof SERVICE_MODES)[number];

export const BOOKING_MODES = ["HOME", "STUDIO"] as const;
export type BookingMode = (typeof BOOKING_MODES)[number];

export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "REJECTED",
  "NO_SHOW",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that occupy a provider's calendar slot. */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = ["PENDING", "CONFIRMED"];

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const VERIFICATION_STATUSES = ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const WISHLIST_TARGETS = ["ARTIST", "SALON", "LOOK"] as const;
export type WishlistTarget = (typeof WISHLIST_TARGETS)[number];

export const NOTIFICATION_TYPES = [
  "BOOKING_CREATED",
  "BOOKING_CONFIRMED",
  "BOOKING_REMINDER",
  "BOOKING_CANCELLED",
  "BOOKING_REJECTED",
  "BOOKING_COMPLETED",
  "PAYMENT_SUCCESS",
  "PAYMENT_FAILED",
  "NEW_REVIEW",
  "VERIFICATION_UPDATE",
  "OFFER",
  "SYSTEM",
  "MESSAGE",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const SEARCH_SORTS = [
  "recommended",
  "nearest",
  "rating",
  "price_asc",
  "price_desc",
  "popular",
] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export const PAGINATION = { defaultLimit: 20, maxLimit: 50 } as const;

/** Minutes an unpaid PENDING booking holds a slot before being released. */
export const BOOKING_HOLD_MINUTES = 15;
/** Slot granularity used when generating bookable start times. */
export const SLOT_STEP_MINUTES = 30;
/** How far ahead customers may book. */
export const MAX_BOOKING_DAYS_AHEAD = 120;
/** Customers may cancel free of charge up to this many hours before start. */
export const FREE_CANCELLATION_HOURS = 24;

export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const CURRENCY = "INR";

export const AUTH_COOKIES = {
  access: "rivya_at",
  refresh: "rivya_rt",
  oauthState: "rivya_oauth_state",
  oauthVerifier: "rivya_oauth_verifier",
} as const;

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 30;

/** Upload constraints enforced server-side when signing Cloudinary uploads. */
export const UPLOAD_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  allowedFormats: ["jpg", "jpeg", "png", "webp", "avif", "heic"],
  documentFormats: ["jpg", "jpeg", "png", "pdf"],
} as const;

export const UPLOAD_FOLDERS = [
  "avatars",
  "covers",
  "portfolio",
  "salons",
  "reviews",
  "verification",
] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

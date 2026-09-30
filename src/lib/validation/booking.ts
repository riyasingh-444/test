import { z } from "zod";
import { BOOKING_MODES, BOOKING_STATUSES, PAYMENT_METHODS, PROVIDER_TYPES } from "@/lib/constants";
import { dateKey, lngLat, objectId, pageQuery, timeHHmm } from "./common";

export const addressSchema = z.object({
  line1: z.string().trim().min(3, "Enter the address").max(200),
  line2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2).max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit pincode").optional(),
  coordinates: lngLat.optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const createBookingSchema = z
  .object({
    providerType: z.enum(PROVIDER_TYPES),
    providerId: objectId,
    serviceId: objectId,
    date: dateKey,
    time: timeHHmm,
    mode: z.enum(BOOKING_MODES),
    address: addressSchema.optional(),
    note: z.string().trim().max(1000).optional(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    offerCode: z.string().trim().toUpperCase().max(30).optional(),
  })
  .refine((v) => v.mode !== "HOME" || v.address, { message: "Address is required for home service", path: ["address"] });
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const slotsQuerySchema = z.object({ serviceId: objectId, date: dateKey });

export const bookingActionSchema = z.object({
  action: z.enum(["cancel", "accept", "reject", "complete", "no_show"]),
  reason: z.string().trim().max(500).optional(),
});
export type BookingAction = z.infer<typeof bookingActionSchema>["action"];

export const bookingListSchema = pageQuery.extend({
  scope: z.enum(["upcoming", "past", "cancelled", "all"]).default("upcoming"),
  status: z.enum(BOOKING_STATUSES).optional(),
  as: z.enum(["customer", "provider"]).default("customer"),
  from: dateKey.optional(),
  to: dateKey.optional(),
});

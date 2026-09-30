import { z } from "zod";
import { indianPhone, lngLat, personName } from "./common";

export const updateProfileSchema = z.object({
  name: personName.optional(),
  phone: z.union([indianPhone, z.literal("")]).optional(),
  defaultCity: z.string().trim().max(60).optional(),
  notificationPrefs: z.object({ email: z.boolean(), marketing: z.boolean() }).partial().optional(),
});

export const savedAddressSchema = z.object({
  label: z.string().trim().min(1).max(40).default("Home"),
  line1: z.string().trim().min(3, "Enter the address").max(200),
  line2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, "Enter the city").max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit pincode").optional().or(z.literal("")),
  coordinates: lngLat.optional(),
  isDefault: z.boolean().optional(),
});
export type SavedAddressInput = z.infer<typeof savedAddressSchema>;

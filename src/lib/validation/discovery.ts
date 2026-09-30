import { z } from "zod";
import { BOOKING_MODES, PAGINATION, SEARCH_SORTS } from "@/lib/constants";

const bool = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => v === true || v === "true" || v === "1");

export const providerSearchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(60).optional(), // category slug
  group: z.string().trim().max(40).optional(), // category group key
  city: z.string().trim().max(60).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(100).default(25),
  minPrice: z.coerce.number().min(0).optional(), // rupees
  maxPrice: z.coerce.number().min(0).optional(), // rupees
  minRating: z.coerce.number().min(0).max(5).optional(),
  minExperience: z.coerce.number().min(0).max(60).optional(),
  mode: z.enum(BOOKING_MODES).optional(),
  verified: bool.optional(),
  available: z.enum(["today", "week"]).optional(),
  /** Specific day (YYYY-MM-DD): only providers working that day. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort: z.enum(SEARCH_SORTS).default("recommended"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
});
export type ProviderSearchParams = z.infer<typeof providerSearchSchema>;

export const looksQuerySchema = z.object({
  style: z.string().trim().max(40).optional(),
  category: z.string().trim().max(60).optional(),
  city: z.string().trim().max(60).optional(),
  providerId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  cursor: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(24),
});
export type LooksQuery = z.infer<typeof looksQuerySchema>;

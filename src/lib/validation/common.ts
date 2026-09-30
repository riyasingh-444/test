import { z } from "zod";
import { PAGINATION } from "@/lib/constants";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const email = z.email("Enter a valid email").trim().toLowerCase().max(254);

/** Indian mobile numbers, normalised to E.164 (+91XXXXXXXXXX). */
export const indianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .transform((v) => (v.startsWith("+91") ? v.slice(3) : v.startsWith("91") && v.length === 12 ? v.slice(2) : v))
  .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number")
  .transform((v) => `+91${v}`);

export const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Include at least one letter and one number");

export const personName = z.string().trim().min(2, "Enter your name").max(80);

export const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
export const timeHHmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm");

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
});

/** Money input in rupees from forms → stored as paise. */
export const rupees = z.coerce.number().min(0).max(10_000_000);

export const lngLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

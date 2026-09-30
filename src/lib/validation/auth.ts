import { z } from "zod";
import { email, indianPhone, password, personName } from "./common";

export const registerSchema = z.object({
  name: personName,
  email,
  password,
  phone: indianPhone.optional(),
  /** Admins are never self-registered. */
  accountType: z.enum(["CUSTOMER", "ARTIST", "SALON"]).default("CUSTOMER"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const otpRequestSchema = z.object({ phone: indianPhone });
export const otpVerifySchema = z.object({
  phone: indianPhone,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  name: personName.optional(),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(20).max(200).optional() });

/** `currentPassword` is required by the service only when the account already has one (Google/OTP users may set a first password). */
export const changePasswordSchema = z.object({
  currentPassword: z.string().max(128).optional(),
  newPassword: password,
});

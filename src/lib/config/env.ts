import "server-only";
import { z } from "zod";

/**
 * Centralised, validated server configuration.
 * Required values throw on first access; optional integrations expose
 * `isConfigured` flags so features can degrade clearly instead of faking data.
 */
const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  CLOUDINARY_CLOUD_NAME: optional,
  CLOUDINARY_API_KEY: optional,
  CLOUDINARY_API_SECRET: optional,
  RAZORPAY_KEY_ID: optional,
  RAZORPAY_KEY_SECRET: optional,
  RAZORPAY_WEBHOOK_SECRET: optional,
  EMAIL_API_KEY: optional,
  EMAIL_FROM: z.string().default("Rivya <hello@example.com>"),
  CRON_SECRET: optional,
  PLATFORM_COMMISSION_BPS: z.coerce.number().int().min(0).max(10_000).default(1000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid server environment configuration:\n${issues}\nSee .env.example.`);
  }
  cached = parsed.data;
  return cached;
}

/** Reset cache — used by tests that mutate process.env. */
export function resetEnvCache() {
  cached = undefined;
}

export const integrations = {
  google: () => Boolean(env().GOOGLE_CLIENT_ID && env().GOOGLE_CLIENT_SECRET),
  cloudinary: () =>
    Boolean(env().CLOUDINARY_CLOUD_NAME && env().CLOUDINARY_API_KEY && env().CLOUDINARY_API_SECRET),
  razorpay: () => Boolean(env().RAZORPAY_KEY_ID && env().RAZORPAY_KEY_SECRET),
  email: () => Boolean(env().EMAIL_API_KEY),
};

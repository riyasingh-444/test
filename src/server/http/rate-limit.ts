import "server-only";
import { errors } from "./errors";

/**
 * Rate limiter abstraction. The in-memory fixed-window store is fine for a single
 * instance / development; swap `store` for a Redis/Upstash implementation in production
 * multi-instance deployments without touching call sites.
 */
export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  async hit(key: string, windowMs: number) {
    const now = Date.now();
    const b = this.buckets.get(key);
    if (!b || b.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      if (this.buckets.size > 50_000) this.sweep(now);
      return fresh;
    }
    b.count += 1;
    return b;
  }
  private sweep(now: number) {
    for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k);
  }
}

const globalStore = globalThis as unknown as { __rivyaRateStore?: RateLimitStore };
let store: RateLimitStore = (globalStore.__rivyaRateStore ??= new MemoryStore());

export function setRateLimitStore(s: RateLimitStore) {
  store = s;
}

export const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 60_000 },
  otp: { limit: 5, windowMs: 10 * 60_000 },
  write: { limit: 60, windowMs: 60_000 },
  read: { limit: 300, windowMs: 60_000 },
} as const;

export async function rateLimit(key: string, rule: { limit: number; windowMs: number }) {
  if (process.env.NODE_ENV === "test") return;
  const { count } = await store.hit(key, rule.windowMs);
  if (count > rule.limit) throw errors.rateLimited();
}

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

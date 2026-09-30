import "server-only";
import { cookies } from "next/headers";
import { LOCATION_COOKIE, parseLocationCookie } from "@/lib/location";
import { connectDB } from "@/server/db/connection";
import { getCurrentUser } from "@/server/auth/current-user";
import { childLogger } from "@/lib/logger";

const log = childLogger("page");

/** Read the visitor's saved discovery location (city and/or coordinates). */
export async function getUserLocation() {
  return parseLocationCookie((await cookies()).get(LOCATION_COOKIE)?.value);
}

/** Session user for server components; never throws (renders as signed-out on failure). */
export async function getSessionUser() {
  try {
    const u = await getCurrentUser();
    return u ? { id: u.id, name: u.name, role: u.role, email: u.email, avatarUrl: u.avatarUrl } : null;
  } catch (err) {
    log.error({ err }, "Failed to resolve session user");
    return null;
  }
}

/**
 * Run a data loader for a page section. Returns `{ data }` or `{ error }` so one failing
 * section renders its own error state instead of taking down the whole page.
 */
export type Loaded<T> = { ok: true; data: T } | { ok: false; error: string };

export async function load<T>(fn: () => Promise<T>): Promise<Loaded<T>> {
  try {
    await connectDB();
    return { ok: true, data: await fn() };
  } catch (err) {
    log.error({ err }, "Section loader failed");
    return { ok: false, error: "We couldn't load this right now." };
  }
}

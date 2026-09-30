import { findCity } from "./catalog";

/** User's chosen discovery location, persisted in a (non-sensitive) cookie so SSR can use it. */
export const LOCATION_COOKIE = "rivya_loc";

export type UserLocation = {
  city?: string; // city display name, e.g. "Delhi"
  lat?: number;
  lng?: number;
  label?: string; // e.g. "Current location"
};

export function parseLocationCookie(raw?: string | null): UserLocation | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as UserLocation;
    const out: UserLocation = {};
    const city = findCity(v.city);
    if (city) out.city = city.name;
    if (typeof v.lat === "number" && typeof v.lng === "number" && Math.abs(v.lat) <= 90 && Math.abs(v.lng) <= 180) {
      out.lat = +v.lat.toFixed(4);
      out.lng = +v.lng.toFixed(4);
    }
    if (typeof v.label === "string") out.label = v.label.slice(0, 40);
    return out.city || out.lat != null ? out : null;
  } catch {
    return null;
  }
}

export function serializeLocation(loc: UserLocation) {
  return encodeURIComponent(JSON.stringify(loc));
}

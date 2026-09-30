import { TZDate } from "@date-fns/tz";
import { DEFAULT_TIMEZONE } from "./constants";

/**
 * Calendar helpers. Bookings are stored as UTC instants; "dateKey" (YYYY-MM-DD) and
 * "HH:mm" are always interpreted in the provider's timezone (Asia/Kolkata by default).
 */

export function parseDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  return { y, m, d };
}

export function parseHHmm(hhmm: string) {
  const [h, min] = hhmm.split(":").map(Number) as [number, number];
  return { h, min, minutes: h * 60 + min };
}

/** UTC instant for a wall-clock time on a date in a timezone. */
export function zonedInstant(dateKey: string, hhmm: string, tz = DEFAULT_TIMEZONE): Date {
  const { y, m, d } = parseDateKey(dateKey);
  const { h, min } = parseHHmm(hhmm);
  return new Date(new TZDate(y, m - 1, d, h, min, 0, tz).getTime());
}

/** YYYY-MM-DD of an instant as seen in a timezone. */
export function dateKeyOf(instant: Date | number, tz = DEFAULT_TIMEZONE) {
  const z = new TZDate(typeof instant === "number" ? instant : instant.getTime(), tz);
  return `${z.getFullYear()}-${pad(z.getMonth() + 1)}-${pad(z.getDate())}`;
}

/** HH:mm of an instant as seen in a timezone. */
export function timeOf(instant: Date, tz = DEFAULT_TIMEZONE) {
  const z = new TZDate(instant.getTime(), tz);
  return `${pad(z.getHours())}:${pad(z.getMinutes())}`;
}

/** Day of week (0 = Sunday) of a calendar date — timezone independent. */
export function weekdayOf(dateKey: string) {
  const { y, m, d } = parseDateKey(dateKey);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDaysToKey(dateKey: string, days: number) {
  const { y, m, d } = parseDateKey(dateKey);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function minutesToHHmm(total: number) {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function todayKey(tz = DEFAULT_TIMEZONE) {
  return dateKeyOf(Date.now(), tz);
}

export function isValidDateKey(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const { y, m, d } = parseDateKey(dateKey);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

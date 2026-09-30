import { SLOT_STEP_MINUTES } from "@/lib/constants";
import { minutesToHHmm, parseHHmm, weekdayOf, zonedInstant } from "@/lib/time";

/**
 * Pure slot computation — no I/O, fully unit-tested.
 * A slot [start, end + buffer) is bookable when it:
 *  - lies within the day's working hours (service itself must end by closing time),
 *  - starts after now + minimum notice,
 *  - doesn't overlap a block (time off / holiday / manual block),
 *  - overlaps fewer than `capacity` existing occupying bookings.
 */
export type WorkingDay = { day: number; isOpen?: boolean | null; open?: string | null; close?: string | null };
export type Interval = { startAt: Date; endAt: Date };
export type OccupiedInterval = { startAt: Date; blockedUntil: Date };

export type SlotInput = {
  dateKey: string;
  timezone: string;
  weeklyHours: WorkingDay[];
  blocks: Interval[];
  bookings: OccupiedInterval[];
  durationMin: number;
  bufferMin: number;
  minNoticeMin: number;
  capacity: number;
  now: Date;
  stepMin?: number;
};

export type Slot = { time: string; startAt: Date; endAt: Date; available: boolean };

export function workingWindow(weeklyHours: WorkingDay[], dateKey: string) {
  const day = weeklyHours.find((w) => w.day === weekdayOf(dateKey));
  if (!day || day.isOpen === false || !day.open || !day.close) return null;
  const open = parseHHmm(day.open).minutes;
  const close = parseHHmm(day.close).minutes;
  return close > open ? { open, close } : null;
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

export function computeSlots(input: SlotInput): Slot[] {
  const window = workingWindow(input.weeklyHours, input.dateKey);
  if (!window) return [];
  const step = input.stepMin ?? SLOT_STEP_MINUTES;
  const earliest = input.now.getTime() + input.minNoticeMin * 60_000;
  const slots: Slot[] = [];

  for (let m = window.open; m + input.durationMin <= window.close; m += step) {
    const time = minutesToHHmm(m);
    const startAt = zonedInstant(input.dateKey, time, input.timezone);
    const endAt = new Date(startAt.getTime() + input.durationMin * 60_000);
    const occupiedUntil = endAt.getTime() + input.bufferMin * 60_000;
    const s = startAt.getTime();

    const blocked = input.blocks.some((b) => overlaps(s, occupiedUntil, b.startAt.getTime(), b.endAt.getTime()));
    const concurrent = input.bookings.filter((b) =>
      overlaps(s, occupiedUntil, b.startAt.getTime(), b.blockedUntil.getTime()),
    ).length;

    slots.push({ time, startAt, endAt, available: s >= earliest && !blocked && concurrent < input.capacity });
  }
  return slots;
}

/** True when `time` is one of the day's bookable slots. */
export function isSlotBookable(input: SlotInput, time: string) {
  return computeSlots(input).some((s) => s.time === time && s.available);
}

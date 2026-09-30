import "server-only";
import type { ClientSession, Types } from "mongoose";
import { DEFAULT_TIMEZONE, MAX_BOOKING_DAYS_AHEAD, type ProviderType } from "@/lib/constants";
import { addDaysToKey, isValidDateKey, todayKey, zonedInstant } from "@/lib/time";
import { computeSlots, type SlotInput } from "@/server/domain/slots";
import { errors } from "@/server/http/errors";
import { Availability, Booking, Service } from "@/server/models";
import type { SlotDTO } from "@/types/dto";

export const DEFAULT_WEEKLY_HOURS = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  isOpen: true,
  open: day === 0 ? "11:00" : "10:00",
  close: "19:00",
}));

/** Bookings that currently occupy calendar time. Expired unpaid holds don't. */
export function occupyingFilter(now = new Date()) {
  return {
    $or: [
      { status: "CONFIRMED" as const },
      { status: "PENDING" as const, holdExpiresAt: null },
      { status: "PENDING" as const, holdExpiresAt: { $gt: now } },
      { status: "PENDING" as const, paymentStatus: "PAID" as const },
    ],
  };
}

export async function getOrCreateAvailability(providerType: ProviderType, providerId: Types.ObjectId | string, session?: ClientSession) {
  const existing = await Availability.findOne({ providerType, providerId }).session(session ?? null);
  if (existing) return existing;
  const [created] = await Availability.create(
    [{ providerType, providerId, weeklyHours: DEFAULT_WEEKLY_HOURS, timezone: DEFAULT_TIMEZONE }],
    { session },
  );
  return created!;
}

export function assertBookableDate(dateKey: string, tz = DEFAULT_TIMEZONE) {
  if (!isValidDateKey(dateKey)) throw errors.validation({ date: ["Invalid date"] });
  const today = todayKey(tz);
  if (dateKey < today) throw errors.validation({ date: ["Date is in the past"] });
  if (dateKey > addDaysToKey(today, MAX_BOOKING_DAYS_AHEAD)) {
    throw errors.validation({ date: [`Bookings open up to ${MAX_BOOKING_DAYS_AHEAD} days ahead`] });
  }
}

/** Assemble the pure slot-computation input from the database (optionally inside a transaction). */
export async function buildSlotInput(args: {
  providerType: ProviderType;
  providerId: Types.ObjectId;
  dateKey: string;
  durationMin: number;
  bufferMin: number;
  now?: Date;
  session?: ClientSession;
}): Promise<SlotInput> {
  const now = args.now ?? new Date();
  const avail = await getOrCreateAvailability(args.providerType, args.providerId, args.session);
  const tz = avail.timezone ?? DEFAULT_TIMEZONE;
  const dayStart = zonedInstant(args.dateKey, "00:00", tz);
  const dayEnd = zonedInstant(addDaysToKey(args.dateKey, 1), "00:00", tz);
  const bookings = await Booking.find({
    providerId: args.providerId,
    startAt: { $lt: dayEnd },
    blockedUntil: { $gt: dayStart },
    ...occupyingFilter(now),
  })
    .select("startAt blockedUntil")
    .session(args.session ?? null)
    .lean();

  return {
    dateKey: args.dateKey,
    timezone: tz,
    weeklyHours: avail.weeklyHours,
    blocks: avail.blocks.filter((b) => b.startAt < dayEnd && b.endAt > dayStart),
    bookings,
    durationMin: args.durationMin,
    bufferMin: args.bufferMin,
    minNoticeMin: avail.minNoticeMin ?? 120,
    capacity: avail.capacity ?? 1,
    now,
  };
}

export const availabilityService = {
  async getSlots(serviceId: string, dateKey: string): Promise<{ dateKey: string; slots: SlotDTO[] }> {
    const service = await Service.findOne({ _id: serviceId, isActive: true }).lean();
    if (!service) throw errors.notFound("Service");
    assertBookableDate(dateKey);
    const input = await buildSlotInput({
      providerType: service.providerType,
      providerId: service.providerId,
      dateKey,
      durationMin: service.durationMin,
      bufferMin: service.bufferMin ?? 0,
    });
    return {
      dateKey,
      slots: computeSlots(input).map((s) => ({
        time: s.time,
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
        available: s.available,
      })),
    };
  },
};

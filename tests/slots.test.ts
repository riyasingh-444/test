import { describe, expect, it } from "vitest";
import { computeSlots, type SlotInput } from "@/server/domain/slots";
import { zonedInstant } from "@/lib/time";

const TZ = "Asia/Kolkata";
const DATE = "2030-03-12"; // a Tuesday

const base = (over: Partial<SlotInput> = {}): SlotInput => ({
  dateKey: DATE,
  timezone: TZ,
  weeklyHours: [{ day: 2, isOpen: true, open: "10:00", close: "14:00" }],
  blocks: [],
  bookings: [],
  durationMin: 60,
  bufferMin: 0,
  minNoticeMin: 0,
  capacity: 1,
  now: new Date("2030-01-01T00:00:00Z"),
  ...over,
});

const available = (input: SlotInput) => computeSlots(input).filter((s) => s.available).map((s) => s.time);

describe("computeSlots", () => {
  it("generates 30-minute steps where the service fits before closing", () => {
    expect(available(base())).toEqual(["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00"]);
  });

  it("returns nothing on closed days", () => {
    expect(computeSlots(base({ weeklyHours: [{ day: 2, isOpen: false, open: "10:00", close: "14:00" }] }))).toEqual([]);
    expect(computeSlots(base({ weeklyHours: [{ day: 3, isOpen: true, open: "10:00", close: "14:00" }] }))).toEqual([]);
  });

  it("interprets working hours in the provider timezone (IST = UTC+5:30)", () => {
    const [first] = computeSlots(base());
    expect(first!.startAt.toISOString()).toBe("2030-03-12T04:30:00.000Z");
  });

  it("excludes slots overlapping a booking, including its buffer", () => {
    const bookings = [{ startAt: zonedInstant(DATE, "11:00", TZ), blockedUntil: zonedInstant(DATE, "12:30", TZ) }];
    // 60-min service: 10:00–11:00 ok (touches), 10:30–11:30 overlaps, … 12:30 ok.
    expect(available(base({ bookings }))).toEqual(["10:00", "12:30", "13:00"]);
  });

  it("applies the new booking's own buffer against later bookings", () => {
    const bookings = [{ startAt: zonedInstant(DATE, "12:00", TZ), blockedUntil: zonedInstant(DATE, "13:00", TZ) }];
    // With a 30-min buffer, a 10:30 start occupies until 12:00 (ok), 11:00 would run into 12:00.
    expect(available(base({ bookings, bufferMin: 30 }))).toEqual(["10:00", "10:30", "13:00"]);
  });

  it("allows parallel bookings up to capacity", () => {
    const bookings = [{ startAt: zonedInstant(DATE, "10:00", TZ), blockedUntil: zonedInstant(DATE, "11:00", TZ) }];
    expect(available(base({ bookings, capacity: 2 }))).toContain("10:00");
    expect(available(base({ bookings: [...bookings, ...bookings], capacity: 2 }))).not.toContain("10:00");
  });

  it("respects blocks and minimum notice", () => {
    const blocks = [{ startAt: zonedInstant(DATE, "10:00", TZ), endAt: zonedInstant(DATE, "12:00", TZ) }];
    expect(available(base({ blocks }))).toEqual(["12:00", "12:30", "13:00"]);

    const now = zonedInstant(DATE, "10:15", TZ);
    expect(available(base({ now, minNoticeMin: 120 }))).toEqual(["12:30", "13:00"]);
  });
});

import { describe, expect, it } from "vitest";
import "./helpers";
import { bookingService } from "@/server/services/booking.service";
import { availabilityService } from "@/server/services/availability.service";
import { reviewService } from "@/server/services/review.service";
import { checkTransition } from "@/server/domain/booking-state";
import { Artist, Booking, Offer } from "@/server/models";
import { futureDate, makeArtist, makeUser } from "./factories";
import { createBookingSchema } from "@/lib/validation/booking";

const input = (artist: { _id: unknown }, service: { _id: unknown }, over: Record<string, unknown> = {}) =>
  createBookingSchema.parse({
    providerType: "ARTIST",
    providerId: String(artist._id),
    serviceId: String(service._id),
    date: futureDate(),
    time: "11:00",
    mode: "STUDIO",
    paymentMethod: "PAY_AT_VENUE",
    ...over,
  });

describe("booking creation", () => {
  it("creates a PENDING booking with price snapshot and commission", async () => {
    const { artist, service } = await makeArtist();
    const customer = await makeUser();
    const b = await bookingService.create(customer, input(artist, service, { mode: "HOME", address: { line1: "12 Rose Lane", city: "Delhi" } }));
    expect(b.status).toBe("PENDING");
    expect(b.pricing).toMatchObject({ subtotal: 500_000, homeServiceFee: 50_000, total: 550_000 });
    expect(b.code).toMatch(/^RV-[A-Z0-9]{6}$/);
    const stored = await Booking.findById(b.id).lean();
    expect(stored!.pricing.commission).toBe(55_000); // 10% default
    expect(stored!.blockedUntil.getTime() - stored!.endAt.getTime()).toBe(30 * 60_000);
  });

  it("prevents double booking under concurrent requests", async () => {
    const { artist, service } = await makeArtist();
    const customers = await Promise.all(Array.from({ length: 6 }, () => makeUser()));
    const results = await Promise.allSettled(customers.map((c) => bookingService.create(c, input(artist, service))));
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed.every((f) => f.reason.code === "SLOT_UNAVAILABLE")).toBe(true);
    expect(await Booking.countDocuments({ providerId: artist._id })).toBe(1);
  });

  it("blocks overlapping times (not just identical start times)", async () => {
    const { artist, service } = await makeArtist();
    await bookingService.create(await makeUser(), input(artist, service, { time: "11:00" }));
    // 90-min service + 30-min buffer occupies 11:00–13:00.
    await expect(bookingService.create(await makeUser(), input(artist, service, { time: "12:00" }))).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
    await expect(bookingService.create(await makeUser(), input(artist, service, { time: "13:00" }))).resolves.toBeTruthy();
  });

  it("frees the slot once a booking is cancelled, and hides it from slot lists while held", async () => {
    const { artist, service } = await makeArtist();
    const c = await makeUser();
    const b = await bookingService.create(c, input(artist, service));
    let slots = await availabilityService.getSlots(String(service._id), futureDate());
    expect(slots.slots.find((s) => s.time === "11:00")!.available).toBe(false);
    await bookingService.transition(c, b.id, "cancel");
    slots = await availabilityService.getSlots(String(service._id), futureDate());
    expect(slots.slots.find((s) => s.time === "11:00")!.available).toBe(true);
  });

  it("releases expired unpaid online holds", async () => {
    const { artist, service } = await makeArtist();
    const c = await makeUser();
    const b = await bookingService.create(c, input(artist, service, { paymentMethod: "ONLINE" }), { onlinePaymentsEnabled: true });
    expect(b.holdExpiresAt).toBeTruthy();
    const res = await bookingService.expireHolds(new Date(Date.now() + 16 * 60_000));
    expect(res.expired).toBe(1);
    await expect(bookingService.create(await makeUser(), input(artist, service), {})).resolves.toBeTruthy();
  });

  it("rejects online payment when payments aren't configured", async () => {
    const { artist, service } = await makeArtist();
    await expect(
      bookingService.create(await makeUser(), input(artist, service, { paymentMethod: "ONLINE" }), { onlinePaymentsEnabled: false }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("enforces service area for home bookings", async () => {
    const { artist, service } = await makeArtist();
    await expect(
      bookingService.create(await makeUser(), input(artist, service, { mode: "HOME", address: { line1: "1 MG Road", city: "Mumbai" } })),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      bookingService.create(
        await makeUser(),
        input(artist, service, { mode: "HOME", address: { line1: "Far away", city: "Delhi", coordinates: [77.9, 28.9] } }),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("does not let partners book themselves", async () => {
    const { owner, artist, service } = await makeArtist();
    await expect(bookingService.create(owner, input(artist, service))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("applies an offer code and enforces its usage limit", async () => {
    const { artist, service } = await makeArtist();
    await Offer.create({
      title: "Welcome",
      code: "WELCOME10",
      discountType: "PERCENT",
      discountValue: 10,
      maxDiscount: 30_000,
      startsAt: new Date(Date.now() - 1000),
      endsAt: new Date(Date.now() + 86_400_000),
      usageLimit: 1,
    });
    const b = await bookingService.create(await makeUser(), input(artist, service, { offerCode: "welcome10" }));
    expect(b.pricing.discount).toBe(30_000); // 10% of 5000 = 500, capped at 300
    await expect(
      bookingService.create(await makeUser(), input(artist, service, { time: "15:00", offerCode: "WELCOME10" })),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("booking permissions & lifecycle", () => {
  it("only lets the owning partner accept, and hides bookings from strangers", async () => {
    const { owner, artist, service } = await makeArtist();
    const other = await makeArtist();
    const customer = await makeUser();
    const b = await bookingService.create(customer, input(artist, service));

    await expect(bookingService.transition(customer, b.id, "accept")).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(bookingService.transition(other.owner, b.id, "accept")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(bookingService.getForUser(await makeUser(), b.id)).rejects.toMatchObject({ code: "NOT_FOUND" });

    const accepted = await bookingService.transition(owner, b.id, "accept");
    expect(accepted.status).toBe("CONFIRMED");
    const asProvider = await bookingService.list(owner, { as: "provider", scope: "upcoming", page: 1, limit: 10 });
    expect(asProvider.items[0]!.customer?.name).toBe(customer.name);
  });

  it("state machine enforces timing and payment rules", () => {
    const future = new Date(Date.now() + 3_600_000);
    const past = new Date(Date.now() - 3_600_000);
    const base = { paymentMethod: "PAY_AT_VENUE", paymentStatus: "PENDING" } as const;
    expect(checkTransition({ ...base, action: "complete", actor: "PROVIDER", status: "CONFIRMED", startAt: future }).ok).toBe(false);
    expect(checkTransition({ ...base, action: "complete", actor: "PROVIDER", status: "CONFIRMED", startAt: past }).ok).toBe(true);
    expect(checkTransition({ ...base, action: "cancel", actor: "CUSTOMER", status: "COMPLETED", startAt: future }).ok).toBe(false);
    expect(checkTransition({ ...base, action: "accept", actor: "PROVIDER", status: "PENDING", startAt: future, paymentMethod: "ONLINE" }).ok).toBe(false);
    expect(checkTransition({ ...base, action: "accept", actor: "CUSTOMER", status: "PENDING", startAt: future }).ok).toBe(false);
  });
});

describe("reviews", () => {
  async function completedBooking() {
    const ctx = await makeArtist();
    const customer = await makeUser("CUSTOMER", "Priya Sharma");
    const b = await bookingService.create(customer, input(ctx.artist, ctx.service));
    await bookingService.transition(ctx.owner, b.id, "accept");
    // Move the booking into the past so it can be completed.
    const past = new Date(Date.now() - 2 * 3_600_000);
    await Booking.updateOne({ _id: b.id }, { startAt: past, endAt: past });
    await bookingService.transition(ctx.owner, b.id, "complete");
    return { ...ctx, customer, bookingId: b.id };
  }

  it("allows exactly one verified review per completed booking and updates the rating", async () => {
    const { customer, bookingId, artist } = await completedBooking();
    const review = await reviewService.create(customer, { bookingId, rating: 5, comment: "Stunning work!", images: [] });
    expect(review.verified).toBe(true);
    expect(review.customerName).toBe("Priya S.");
    await expect(reviewService.create(customer, { bookingId, rating: 4, images: [] })).rejects.toMatchObject({ code: "CONFLICT" });
    const a = await Artist.findById(artist._id).lean();
    expect(a).toMatchObject({ ratingAvg: 5, reviewCount: 1, bookingCount: 1 });
  });

  it("rejects reviews for bookings that aren't completed or aren't yours", async () => {
    const { artist, service } = await makeArtist();
    const customer = await makeUser();
    const b = await bookingService.create(customer, input(artist, service));
    await expect(reviewService.create(customer, { bookingId: b.id, rating: 5, images: [] })).rejects.toMatchObject({ code: "CONFLICT" });

    const done = await completedBooking();
    await expect(reviewService.create(await makeUser(), { bookingId: done.bookingId, rating: 1, images: [] })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

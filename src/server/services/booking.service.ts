import "server-only";
import { Types } from "mongoose";
import { BOOKING_HOLD_MINUTES, type BookingStatus } from "@/lib/constants";
import { env, integrations } from "@/lib/config/env";
import { childLogger } from "@/lib/logger";
import { timeOf, zonedInstant } from "@/lib/time";
import { formatPaise } from "@/lib/utils";
import type { BookingAction, CreateBookingInput } from "@/lib/validation/booking";
import type { AuthUser } from "@/server/auth/current-user";
import { withTransaction } from "@/server/db/transactions";
import { actorFor, checkTransition } from "@/server/domain/booking-state";
import { isSlotBookable } from "@/server/domain/slots";
import { errors } from "@/server/http/errors";
import { toBooking } from "@/server/mappers";
import { Artist, Booking, Salon, ScheduleLock, Service, User, type BookingDoc } from "@/server/models";
import { notificationService } from "@/server/notifications";
import { emailLayout } from "@/server/notifications/email";
import type { BookingDTO, Paginated } from "@/types/dto";
import { assertBookableDate, buildSlotInput } from "./availability.service";
import { offerService } from "./offer.service";
import { getOwnedProvider, haversineKm, isOwner, loadProvider } from "./provider-access";

const log = childLogger("booking");

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function bookingCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `RV-${Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("")}`;
}

/** Hooks run after a booking leaves an active state (payments module registers refunds here). */
type AfterCancelHook = (booking: BookingDoc) => Promise<void>;
const afterCancelHooks: AfterCancelHook[] = [];
export function onBookingCancelled(hook: AfterCancelHook) {
  afterCancelHooks.push(hook);
}

export const bookingService = {
  /**
   * Create a booking without double-booking.
   * Inside one transaction: bump the provider/day lock (serialises concurrent attempts),
   * re-check the slot against committed bookings, then insert.
   */
  async create(user: AuthUser, input: CreateBookingInput, opts: { onlinePaymentsEnabled?: boolean } = {}): Promise<BookingDTO> {
    const onlineEnabled = opts.onlinePaymentsEnabled ?? integrations.razorpay();
    if (input.paymentMethod === "ONLINE" && !onlineEnabled) {
      throw errors.validation({ paymentMethod: ["Online payment isn't available yet — choose pay at venue"] });
    }
    assertBookableDate(input.date);

    const providerId = new Types.ObjectId(input.providerId);
    // Ensure the lock document exists outside the transaction (avoids upsert races inside it).
    await ScheduleLock.updateOne({ providerId, dateKey: input.date }, { $setOnInsert: { version: 0 } }, { upsert: true }).catch(
      (e: { code?: number }) => {
        if (e.code !== 11000) throw e;
      },
    );

    const booking = await withTransaction(async (session) => {
      const service = await Service.findOne({
        _id: input.serviceId,
        providerType: input.providerType,
        providerId,
        isActive: true,
      })
        .session(session)
        .lean();
      if (!service) throw errors.notFound("Service");

      const provider = await loadProvider(input.providerType, providerId, session);
      if (!provider.isActive || provider.verificationStatus === "REJECTED") throw errors.badRequest("This professional isn't taking bookings");
      if (isOwner(user, provider)) throw errors.forbidden("You can't book your own services");

      // Service mode compatibility
      const svcHome = service.serviceMode !== "STUDIO";
      const svcStudio = service.serviceMode !== "HOME";
      if (input.mode === "HOME" && !(svcHome && provider.offersHome)) throw errors.validation({ mode: ["Home service isn't offered for this"] });
      if (input.mode === "STUDIO" && !(svcStudio && provider.offersStudio)) throw errors.validation({ mode: ["Studio visits aren't offered for this"] });

      if (input.mode === "HOME") {
        const addr = input.address!;
        if (addr.coordinates) {
          const km = haversineKm(addr.coordinates, provider.point);
          if (km > provider.serviceRadiusKm) {
            throw errors.validation({ address: [`This address is ${Math.round(km)} km away — outside the ${provider.serviceRadiusKm} km service area`] });
          }
        } else if (addr.city.trim().toLowerCase() !== provider.city.toLowerCase()) {
          throw errors.validation({ address: [`Home service is available in ${provider.city} only`] });
        }
      }

      // Serialise concurrent bookings for this provider/day: concurrent transactions that both
      // bump this document hit a write conflict; the loser retries and re-reads the calendar.
      await ScheduleLock.updateOne({ providerId, dateKey: input.date }, { $inc: { version: 1 } }, { session });

      const slotInput = await buildSlotInput({
        providerType: input.providerType,
        providerId,
        dateKey: input.date,
        durationMin: service.durationMin,
        bufferMin: service.bufferMin ?? 0,
        session,
      });
      if (!isSlotBookable(slotInput, input.time)) throw errors.slotUnavailable();

      const startAt = zonedInstant(input.date, input.time, slotInput.timezone);
      const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);
      const blockedUntil = new Date(endAt.getTime() + (service.bufferMin ?? 0) * 60_000);

      const subtotal = service.price;
      const homeServiceFee = input.mode === "HOME" ? (service.homeServiceFee ?? 0) : 0;
      let discount = 0;
      let offerCode: string | undefined;
      if (input.offerCode) {
        const redeemed = await offerService.redeem(
          input.offerCode,
          { providerType: input.providerType, providerId, categoryId: service.categoryId, subtotal },
          session,
        );
        discount = redeemed.discount;
        offerCode = redeemed.code;
      }
      const total = Math.max(0, subtotal + homeServiceFee - discount);
      const commission = Math.floor((total * env().PLATFORM_COMMISSION_BPS) / 10_000);

      const [created] = await Booking.create(
        [
          {
            code: bookingCode(),
            customerId: user.id,
            providerType: input.providerType,
            providerId,
            serviceId: service._id,
            serviceSnapshot: { name: service.name, durationMin: service.durationMin, bufferMin: service.bufferMin ?? 0, price: service.price },
            providerSnapshot: { name: provider.name, slug: provider.slug },
            dateKey: input.date,
            startAt,
            endAt,
            blockedUntil,
            mode: input.mode,
            address:
              input.mode === "HOME" && input.address
                ? {
                    line1: input.address.line1,
                    line2: input.address.line2,
                    landmark: input.address.landmark,
                    city: input.address.city,
                    pincode: input.address.pincode,
                    point: input.address.coordinates ? { type: "Point", coordinates: input.address.coordinates } : undefined,
                  }
                : undefined,
            customerNote: input.note,
            pricing: { subtotal, homeServiceFee, discount, platformFee: 0, total, commission, currency: "INR" },
            offerCode,
            paymentMethod: input.paymentMethod,
            status: "PENDING",
            paymentStatus: "PENDING",
            holdExpiresAt: input.paymentMethod === "ONLINE" ? new Date(Date.now() + BOOKING_HOLD_MINUTES * 60_000) : null,
            statusHistory: [{ status: "PENDING", byUserId: user.id, byRole: user.role }],
          },
        ],
        { session },
      );
      return { booking: created!, ownerUserId: provider.ownerUserId };
    });

    const b = booking.booking;
    if (b.paymentMethod === "PAY_AT_VENUE") {
      await notificationService.notify(booking.ownerUserId, {
        type: "BOOKING_CREATED",
        title: "New booking request",
        body: `${b.serviceSnapshot.name} on ${b.dateKey} at ${timeOf(b.startAt)} — please accept or decline.`,
        link: `/partner/bookings/${b._id}`,
        data: { bookingId: String(b._id) },
      });
    }
    log.info({ bookingId: String(b._id), providerId: String(b.providerId) }, "Booking created");
    return toBooking(b.toObject());
  },

  async getForUser(user: AuthUser, bookingId: string): Promise<BookingDTO> {
    if (!Types.ObjectId.isValid(bookingId)) throw errors.notFound("Booking");
    const b = await Booking.findById(bookingId).lean();
    if (!b) throw errors.notFound("Booking");
    const access = await accessFor(user, b);
    if (!access) throw errors.notFound("Booking");
    const customer = access !== "CUSTOMER" ? await User.findById(b.customerId).select("name phone").lean() : null;
    return toBooking(b, customer ? { ...customer, phone: b.status === "CONFIRMED" ? customer.phone : null } : null);
  },

  async list(
    user: AuthUser,
    q: { as: "customer" | "provider"; scope: "upcoming" | "past" | "cancelled" | "all"; status?: BookingStatus; page: number; limit: number; from?: string; to?: string },
  ): Promise<Paginated<BookingDTO>> {
    const now = new Date();
    const filter: Record<string, unknown> = {};
    if (q.as === "provider") {
      const provider = await getOwnedProvider(user);
      filter.providerId = provider.id;
    } else {
      filter.customerId = new Types.ObjectId(user.id);
    }
    if (q.status) filter.status = q.status;
    else if (q.scope === "upcoming") {
      filter.status = { $in: ["PENDING", "CONFIRMED"] };
      filter.endAt = { $gte: now };
    } else if (q.scope === "past") {
      filter.$or = [{ status: { $in: ["COMPLETED", "NO_SHOW"] } }, { status: "CONFIRMED", endAt: { $lt: now } }];
    } else if (q.scope === "cancelled") {
      filter.status = { $in: ["CANCELLED", "REJECTED"] };
    }
    if (q.from || q.to) {
      filter.dateKey = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };
    }
    const sort = q.scope === "upcoming" ? { startAt: 1 as const } : { startAt: -1 as const };
    const [items, total] = await Promise.all([
      Booking.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
      Booking.countDocuments(filter),
    ]);
    let customers = new Map<string, { _id: Types.ObjectId; name: string; phone?: string | null }>();
    if (q.as === "provider") {
      const users = await User.find({ _id: { $in: items.map((i) => i.customerId) } }).select("name phone").lean();
      customers = new Map(users.map((u) => [String(u._id), u]));
    }
    return {
      items: items.map((b) => {
        const c = customers.get(String(b.customerId));
        return toBooking(b, c ? { ...c, phone: b.status === "CONFIRMED" ? c.phone : null } : null);
      }),
      page: q.page,
      limit: q.limit,
      total,
      hasMore: q.page * q.limit < total,
    };
  },

  async transition(user: AuthUser, bookingId: string, action: BookingAction, reason?: string, now = new Date()): Promise<BookingDTO> {
    if (!Types.ObjectId.isValid(bookingId)) throw errors.notFound("Booking");
    const b = await Booking.findById(bookingId).lean();
    if (!b) throw errors.notFound("Booking");
    const access = await accessFor(user, b);
    if (!access) throw errors.notFound("Booking");
    const actor = access === "ADMIN" ? "ADMIN" : access;

    const check = checkTransition({
      action,
      actor,
      status: b.status,
      paymentMethod: b.paymentMethod,
      paymentStatus: b.paymentStatus,
      startAt: b.startAt,
      now,
    });
    if (!check.ok) throw errors.conflict(check.reason);

    const set: Record<string, unknown> = { status: check.to };
    if (check.to === "CANCELLED" || check.to === "REJECTED") {
      set.cancellation = { byRole: user.role, reason, at: now };
      set.holdExpiresAt = null;
    }
    // Optimistic concurrency: only apply if nobody changed the status meanwhile.
    const updated = await Booking.findOneAndUpdate(
      { _id: b._id, status: b.status },
      { $set: set, $push: { statusHistory: { status: check.to, byUserId: user.id, byRole: user.role, note: reason, at: now } } },
      { returnDocument: "after" },
    );
    if (!updated) throw errors.conflict("This booking was just updated. Please refresh.");

    if (check.to === "COMPLETED") {
      const model = updated.providerType === "ARTIST" ? Artist : Salon;
      await (model as typeof Artist).updateOne({ _id: updated.providerId }, { $inc: { bookingCount: 1 } });
    }
    if (check.to === "CANCELLED" || check.to === "REJECTED") {
      for (const hook of afterCancelHooks) {
        try {
          await hook(updated);
        } catch (err) {
          log.error({ err, bookingId }, "after-cancel hook failed");
        }
      }
    }
    await notifyTransition(updated, check.to, actor);
    return toBooking(updated.toObject());
  },

  /** Release expired unpaid ONLINE holds (run by the scheduler). */
  async expireHolds(now = new Date()) {
    const expired = await Booking.find({
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: { $ne: "PAID" },
      holdExpiresAt: { $lte: now },
    })
      .select("_id")
      .limit(500)
      .lean();
    let count = 0;
    for (const { _id } of expired) {
      const res = await Booking.updateOne(
        { _id, status: "PENDING", paymentStatus: { $ne: "PAID" } },
        {
          $set: { status: "CANCELLED", paymentStatus: "FAILED", cancellation: { byRole: "SYSTEM", reason: "Payment not completed in time", at: now } },
          $push: { statusHistory: { status: "CANCELLED", byRole: "SYSTEM", note: "Hold expired", at: now } },
        },
      );
      count += res.modifiedCount;
    }
    return { expired: count };
  },
};

async function accessFor(user: AuthUser, b: { customerId: Types.ObjectId; providerType: string; providerId: Types.ObjectId }) {
  if (user.role === "ADMIN") return "ADMIN" as const;
  if (String(b.customerId) === user.id) {
    // A partner who is also the customer (booking someone else) acts as customer.
    return "CUSTOMER" as const;
  }
  if (user.role === "ARTIST" || user.role === "SALON") {
    const provider = await loadProvider(b.providerType as "ARTIST" | "SALON", b.providerId);
    if (isOwner(user, provider)) return "PROVIDER" as const;
  }
  return null;
}

async function notifyTransition(b: BookingDoc, to: BookingStatus, actor: string) {
  const when = `${b.dateKey} at ${timeOf(b.startAt)}`;
  const provider = await loadProvider(b.providerType, b.providerId);
  const base = env().APP_URL;
  const customerLink = `/account/bookings/${b._id}`;
  switch (to) {
    case "CONFIRMED":
      await notificationService.notify(b.customerId, {
        type: "BOOKING_CONFIRMED",
        title: "Your booking is confirmed",
        body: `${b.serviceSnapshot.name} with ${b.providerSnapshot.name} on ${when}.`,
        link: customerLink,
        email: {
          subject: `Confirmed: ${b.serviceSnapshot.name} with ${b.providerSnapshot.name}`,
          html: emailLayout(
            "Your booking is confirmed",
            `<p>${b.serviceSnapshot.name} with <b>${b.providerSnapshot.name}</b><br>${when}<br>Total ${formatPaise(b.pricing.total)}</p><p>Booking reference: <b>${b.code}</b></p>`,
            { label: "View booking", url: `${base}${customerLink}` },
          ),
        },
      });
      break;
    case "REJECTED":
      await notificationService.notify(b.customerId, {
        type: "BOOKING_REJECTED",
        title: "Booking declined",
        body: `${b.providerSnapshot.name} couldn't take your ${b.serviceSnapshot.name} booking on ${when}.`,
        link: customerLink,
      });
      break;
    case "CANCELLED":
      if (actor !== "PROVIDER") {
        await notificationService.notify(provider.ownerUserId, {
          type: "BOOKING_CANCELLED",
          title: "Booking cancelled",
          body: `${b.serviceSnapshot.name} on ${when} was cancelled by the customer.`,
          link: `/partner/bookings/${b._id}`,
        });
      }
      await notificationService.notify(b.customerId, {
        type: "BOOKING_CANCELLED",
        title: "Booking cancelled",
        body: `Your ${b.serviceSnapshot.name} booking on ${when} has been cancelled.`,
        link: customerLink,
      });
      break;
    case "COMPLETED":
      await notificationService.notify(b.customerId, {
        type: "BOOKING_COMPLETED",
        title: `How was your ${b.serviceSnapshot.name}?`,
        body: `Share a review for ${b.providerSnapshot.name} — it helps other women choose.`,
        link: `${customerLink}?review=1`,
      });
      break;
  }
}

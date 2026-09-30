import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, ChevronLeft, Clock, Home, MapPin, Store } from "lucide-react";
import { integrations } from "@/lib/config/env";
import { FREE_CANCELLATION_HOURS } from "@/lib/constants";
import { formatPaise } from "@/lib/utils";
import type { BookingDTO } from "@/types/dto";
import { requireUser } from "@/server/auth/current-user";
import { AppError } from "@/server/http/errors";
import { Booking } from "@/server/models";
import { bookingService } from "@/server/services/booking.service";
import { BookingStatusBadge, formatBookingWhen } from "@/components/booking/booking-card";
import { CancelBookingButton, PayNowButton, ReviewForm } from "@/components/booking/booking-actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Booking details", robots: { index: false } };

const eventTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function bookingFlags(b: BookingDTO, isCustomer: boolean) {
  const now = Date.now();
  const start = new Date(b.startAt).getTime();
  return {
    canCancel: isCustomer && (b.status === "PENDING" || b.status === "CONFIRMED") && start > now,
    holdActive:
      b.paymentMethod === "ONLINE" && b.status === "PENDING" && b.paymentStatus !== "PAID" && Boolean(b.holdExpiresAt) && new Date(b.holdExpiresAt!).getTime() > now,
    lateCancel: start - now < FREE_CANCELLATION_HOURS * 3_600_000,
  };
}

export default async function BookingDetail({ params, searchParams }: PageProps<"/account/bookings/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  let b;
  try {
    b = await bookingService.getForUser(user, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const history = (await Booking.findById(id).select("statusHistory").lean())?.statusHistory ?? [];
  const isCustomer = !b.customer; // customer view has no customer block
  const { canCancel, holdActive, lateCancel } = bookingFlags(b, isCustomer);

  return (
    <div className="max-w-3xl">
      <Link href="/account/bookings" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ChevronLeft className="size-4" aria-hidden="true" /> All bookings
      </Link>

      {sp.new === "1" && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl bg-success-soft p-5 text-success">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              {b.status === "CONFIRMED" ? "You're booked!" : b.paymentMethod === "ONLINE" && b.paymentStatus !== "PAID" ? "Almost there — complete payment to confirm" : "Booking requested"}
            </p>
            <p className="text-sm text-success/90">
              {b.status === "CONFIRMED"
                ? "We've sent the details to your email and notifications."
                : b.paymentMethod === "PAY_AT_VENUE"
                  ? `${b.provider.name} will confirm shortly. We'll notify you as soon as they do.`
                  : "Your slot is held for a few minutes."}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-3xl bg-surface p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wider text-muted uppercase">Booking {b.code}</p>
            <h1 className="mt-2 text-4xl">{b.service.name}</h1>
            <Link href={`/${b.provider.type === "ARTIST" ? "artists" : "salons"}/${b.provider.slug}`} className="mt-1 inline-block text-primary hover:underline">
              with {b.provider.name}
            </Link>
          </div>
          <BookingStatusBadge status={b.status} paymentStatus={b.paymentStatus} paymentMethod={b.paymentMethod} />
        </div>

        <dl className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="flex gap-3"><CalendarDays className="mt-0.5 size-5 text-rose-deep" aria-hidden="true" /><div><dt className="text-xs text-muted">When</dt><dd className="font-medium">{formatBookingWhen(b.startAt)}</dd></div></div>
          <div className="flex gap-3"><Clock className="mt-0.5 size-5 text-rose-deep" aria-hidden="true" /><div><dt className="text-xs text-muted">Duration</dt><dd className="font-medium">{b.service.durationMin} minutes</dd></div></div>
          <div className="flex gap-3">
            {b.mode === "HOME" ? <Home className="mt-0.5 size-5 text-rose-deep" aria-hidden="true" /> : <Store className="mt-0.5 size-5 text-rose-deep" aria-hidden="true" />}
            <div><dt className="text-xs text-muted">Where</dt><dd className="font-medium">{b.mode === "HOME" ? "At your address" : "At the studio / salon"}</dd></div>
          </div>
          {b.address && (
            <div className="flex gap-3"><MapPin className="mt-0.5 size-5 text-rose-deep" aria-hidden="true" /><div><dt className="text-xs text-muted">Address</dt><dd className="text-sm">{[b.address.line1, b.address.line2, b.address.landmark, b.address.city, b.address.pincode].filter(Boolean).join(", ")}</dd></div></div>
          )}
        </dl>

        {b.customerNote && <p className="mt-6 rounded-xl bg-blush p-4 text-sm"><span className="font-medium">Your note: </span>{b.customerNote}</p>}

        <dl className="mt-8 space-y-2 border-t border-line pt-6 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Service</dt><dd>{formatPaise(b.pricing.subtotal)}</dd></div>
          {b.pricing.homeServiceFee > 0 && <div className="flex justify-between"><dt className="text-muted">Home service fee</dt><dd>{formatPaise(b.pricing.homeServiceFee)}</dd></div>}
          {b.pricing.discount > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd>−{formatPaise(b.pricing.discount)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatPaise(b.pricing.total)}</dd></div>
          <div className="flex justify-between text-xs text-muted"><dt>Payment</dt><dd>{b.paymentMethod === "ONLINE" ? "Online" : "Pay after service"} · {b.paymentStatus.toLowerCase()}</dd></div>
        </dl>

        {(canCancel || holdActive) && (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {holdActive && <PayNowButton booking={b} />}
            {canCancel && <CancelBookingButton booking={b} />}
            {canCancel && lateCancel && <p className="w-full text-xs text-warning">This is within {FREE_CANCELLATION_HOURS} hours of the appointment — the professional&apos;s cancellation policy may apply.</p>}
          </div>
        )}
      </div>

      {isCustomer && b.canReview && (
        <div className="mt-8"><ReviewForm booking={b} uploadsEnabled={integrations.cloudinary()} /></div>
      )}
      {b.reviewId && <p className="mt-6 text-sm text-muted">You reviewed this booking — thank you!</p>}

      <section aria-labelledby="timeline-h" className="mt-10">
        <h2 id="timeline-h" className="mb-4 text-2xl">Timeline</h2>
        <ol className="relative space-y-4 border-l border-line pl-6">
          {history.map((h, i) => (
            <li key={i} className="relative">
              <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-primary ring-4 ring-blush" aria-hidden="true" />
              <p className="text-sm font-medium text-ink capitalize">{h.status.toLowerCase().replace("_", " ")}</p>
              <p className="text-xs text-muted">{h.at ? eventTime.format(h.at) : ""}{h.note ? ` · ${h.note}` : ""}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-10">
        <Button asChild variant="secondary"><Link href="/explore">Book something else</Link></Button>
      </div>
    </div>
  );
}

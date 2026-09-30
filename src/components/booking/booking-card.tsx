import Link from "next/link";
import { CalendarDays, Clock, Home, Store } from "lucide-react";
import type { BookingStatus, PaymentStatus } from "@/lib/constants";
import { cn, formatPaise } from "@/lib/utils";
import type { BookingDTO } from "@/types/dto";
import { Badge } from "@/components/ui/primitives";

const STATUS: Record<BookingStatus, { label: string; tone: "warning" | "success" | "neutral" | "danger" | "primary" }> = {
  PENDING: { label: "Pending", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "success" },
  COMPLETED: { label: "Completed", tone: "primary" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  REJECTED: { label: "Declined", tone: "danger" },
  NO_SHOW: { label: "No-show", tone: "neutral" },
};

export function BookingStatusBadge({ status, paymentStatus, paymentMethod }: { status: BookingStatus; paymentStatus?: PaymentStatus; paymentMethod?: string }) {
  const s = STATUS[status];
  const label =
    status === "PENDING" && paymentMethod === "ONLINE" && paymentStatus !== "PAID"
      ? "Awaiting payment"
      : status === "PENDING"
        ? "Awaiting confirmation"
        : s.label;
  return <Badge tone={s.tone}>{label}</Badge>;
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
export const formatBookingWhen = (iso: string) => `${dateFmt.format(new Date(iso))} · ${timeFmt.format(new Date(iso))}`;

export function BookingCard({ booking: b, href, perspective = "customer" }: { booking: BookingDTO; href: string; perspective?: "customer" | "provider" }) {
  const start = new Date(b.startAt);
  return (
    <Link href={href} className="group flex gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-primary/30 hover:shadow-card sm:p-5">
      <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft py-2 text-primary">
        <span className="text-[11px] font-semibold uppercase">{new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "Asia/Kolkata" }).format(start)}</span>
        <span className="font-serif text-3xl leading-none">{new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" }).format(start)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink group-hover:text-primary">{b.service.name}</p>
            <p className="truncate text-sm text-muted">{perspective === "customer" ? b.provider.name : (b.customer?.name ?? "Customer")}</p>
          </div>
          <BookingStatusBadge status={b.status} paymentStatus={b.paymentStatus} paymentMethod={b.paymentMethod} />
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden="true" />{formatBookingWhen(b.startAt)}</span>
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{b.service.durationMin} min</span>
          <span className="inline-flex items-center gap-1">
            {b.mode === "HOME" ? <Home className="size-3.5" aria-hidden="true" /> : <Store className="size-3.5" aria-hidden="true" />}
            {b.mode === "HOME" ? "Home service" : "Studio"}
          </span>
          <span className={cn("ml-auto font-semibold text-ink")}>{formatPaise(b.pricing.total)}</span>
        </p>
      </div>
    </Link>
  );
}

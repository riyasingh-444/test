import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Types } from "mongoose";
import { formatPaise } from "@/lib/utils";
import { requireUser } from "@/server/auth/current-user";
import { load } from "@/server/page-context";
import { Payment, Booking } from "@/server/models";
import { Badge } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/feedback/states";

export const metadata: Metadata = { title: "Payments", robots: { index: false } };
const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const TONE = { PAID: "success", PENDING: "warning", FAILED: "danger", REFUNDED: "neutral" } as const;

export default async function PaymentsPage() {
  const user = await requireUser();
  const res = await load(async () => {
    const payments = await Payment.find({ customerId: new Types.ObjectId(user.id) }).sort({ createdAt: -1 }).limit(50).lean();
    const bookings = await Booking.find({ _id: { $in: payments.map((p) => p.bookingId) } }).select("code serviceSnapshot providerSnapshot").lean();
    const byId = new Map(bookings.map((b) => [String(b._id), b]));
    return payments.map((p) => ({ ...p, booking: byId.get(String(p.bookingId)) }));
  });
  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl md:text-5xl">Payments</h1>
      <p className="mt-2 text-muted">Online payments made through Rivya. Pay-after-service bookings are settled directly with the professional.</p>
      <div className="mt-6">
        {!res.ok ? <ErrorState description={res.error} /> : res.data.length === 0 ? (
          <EmptyState icon={CreditCard} title="No online payments yet" description="When you pay for a booking online, the receipt will appear here." />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
            {res.data.map((p) => (
              <li key={String(p._id)} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <Link href={`/account/bookings/${p.bookingId}`} className="font-medium text-ink hover:text-primary">{p.booking?.serviceSnapshot.name ?? "Booking"}</Link>
                  <p className="text-xs text-muted">{p.booking?.providerSnapshot.name} · {p.booking?.code} · {fmt.format(p.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-semibold">{formatPaise(p.amount)}</span>
                  <Badge tone={TONE[p.status]} size="sm">{p.status.toLowerCase()}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { load } from "@/server/page-context";
import { bookingService } from "@/server/services/booking.service";
import { cn } from "@/lib/utils";
import { BookingCard } from "@/components/booking/booking-card";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = { title: "My bookings", robots: { index: false } };

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export default async function BookingsPage({ searchParams }: PageProps<"/account/bookings">) {
  const sp = await searchParams;
  const scope = TABS.find((t) => t.key === sp.scope)?.key ?? "upcoming";
  const page = Math.max(1, Number(sp.page) || 1);
  const user = await requireUser();
  const res = await load(() => bookingService.list(user, { as: "customer", scope, page, limit: 10 }));

  return (
    <div>
      <h1 className="text-4xl md:text-5xl">Bookings</h1>
      <nav aria-label="Booking filters" className="mt-6 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/account/bookings${t.key === "upcoming" ? "" : `?scope=${t.key}`}`}
            aria-current={scope === t.key ? "page" : undefined}
            className={cn("rounded-full px-4 py-2 text-sm font-medium transition", scope === t.key ? "bg-primary text-white" : "bg-surface text-ink hover:text-primary")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">
        {!res.ok ? (
          <ErrorState description={res.error} />
        ) : res.data.items.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={scope === "upcoming" ? "No upcoming bookings" : scope === "past" ? "No past bookings yet" : "No cancelled bookings"}
            description={scope === "upcoming" ? "Your next look is a few taps away." : undefined}
            action={scope === "upcoming" ? { label: "Find an artist", href: "/explore" } : undefined}
          />
        ) : (
          <>
            <ul className="space-y-3">
              {res.data.items.map((b) => <li key={b.id}><BookingCard booking={b} href={`/account/bookings/${b.id}`} /></li>)}
            </ul>
            <Pagination page={page} total={res.data.total} limit={10} basePath="/account/bookings" searchParams={sp} />
          </>
        )}
      </div>
    </div>
  );
}

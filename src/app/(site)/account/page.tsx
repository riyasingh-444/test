import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Heart, Bell } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { load } from "@/server/page-context";
import { accountService } from "@/server/services/account.service";
import { bookingService } from "@/server/services/booking.service";
import { BookingCard } from "@/components/booking/booking-card";
import { EmptyState, ErrorState } from "@/components/feedback/states";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountOverview() {
  const user = await requireUser();
  const [stats, upcoming] = await Promise.all([
    load(() => accountService.overview(user.id)),
    load(() => bookingService.list(user, { as: "customer", scope: "upcoming", page: 1, limit: 3 })),
  ]);
  const tiles = stats.ok
    ? [
        { label: "Upcoming", value: stats.data.upcoming, icon: CalendarDays, href: "/account/bookings" },
        { label: "Completed", value: stats.data.completed, icon: CheckCircle2, href: "/account/bookings?scope=past" },
        { label: "Saved", value: stats.data.saved, icon: Heart, href: "/account/wishlist" },
        { label: "Unread", value: stats.data.unread, icon: Bell, href: "/account/notifications" },
      ]
    : [];
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl md:text-5xl">Your beauty, organised</h1>
        <p className="mt-2 text-muted">Bookings, saved artists and looks — all in one place.</p>
      </header>
      {stats.ok ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map(({ label, value, icon: Icon, href }) => (
            <li key={label}>
              <Link href={href} className="block rounded-2xl bg-surface p-5 shadow-xs transition hover:shadow-card">
                <Icon className="size-5 text-rose-deep" aria-hidden="true" />
                <p className="mt-3 font-serif text-4xl leading-none text-primary">{value}</p>
                <p className="mt-1 text-sm text-muted">{label}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : <ErrorState description={stats.error} />}

      <section aria-labelledby="up-h">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="up-h" className="text-3xl">Upcoming</h2>
          <Link href="/account/bookings" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">All bookings <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
        {!upcoming.ok ? (
          <ErrorState description={upcoming.error} />
        ) : upcoming.data.items.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No upcoming bookings" description="Find an artist you love and book your next look." action={{ label: "Explore artists", href: "/explore" }} />
        ) : (
          <ul className="space-y-3">
            {upcoming.data.items.map((b) => <li key={b.id}><BookingCard booking={b} href={`/account/bookings/${b.id}`} /></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}

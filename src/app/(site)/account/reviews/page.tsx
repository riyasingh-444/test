import type { Metadata } from "next";
import { Star } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { load } from "@/server/page-context";
import { reviewService } from "@/server/services/review.service";
import { ReviewCard } from "@/components/profile/profile-parts";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = { title: "My reviews", robots: { index: false } };

export default async function MyReviews({ searchParams }: PageProps<"/account/reviews">) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const user = await requireUser();
  const res = await load(() => reviewService.listMine(user, page, 10));
  return (
    <div>
      <h1 className="text-4xl md:text-5xl">Your reviews</h1>
      <p className="mt-2 text-muted">You can review any completed booking from its details page.</p>
      <div className="mt-6">
        {!res.ok ? <ErrorState description={res.error} /> : res.data.items.length === 0 ? (
          <EmptyState icon={Star} title="No reviews yet" description="After an appointment is completed, you'll be able to share how it went." action={{ label: "View past bookings", href: "/account/bookings?scope=past" }} />
        ) : (
          <>
            <ul className="grid gap-4 md:grid-cols-2">{res.data.items.map((r) => <li key={r.id}><ReviewCard review={r} /></li>)}</ul>
            <Pagination page={page} total={res.data.total} limit={10} basePath="/account/reviews" searchParams={sp} />
          </>
        )}
      </div>
    </div>
  );
}

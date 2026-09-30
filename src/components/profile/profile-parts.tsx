import Link from "next/link";
import { BadgeCheck, Clock, Home, Store } from "lucide-react";
import { formatPaise } from "@/lib/utils";
import type { ReviewDTO, ServiceDTO } from "@/types/dto";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/ui/display";

export function ServiceList({ services, bookHref }: { services: ServiceDTO[]; bookHref: string }) {
  if (services.length === 0) return <p className="text-sm text-muted">Services will appear here soon.</p>;
  const groups = new Map<string, ServiceDTO[]>();
  for (const s of services) groups.set(s.categoryName ?? "Services", [...(groups.get(s.categoryName ?? "Services") ?? []), s]);
  return (
    <div className="space-y-8">
      {[...groups.entries()].map(([group, list]) => (
        <div key={group}>
          <h3 className="mb-3 font-sans text-xs font-semibold tracking-[0.16em] text-rose-deep uppercase">{group}</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {list.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{s.name}</p>
                  {s.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{s.description}</p>}
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" aria-hidden="true" /> {s.durationMin} min
                    </span>
                    {s.serviceMode !== "STUDIO" && (
                      <span className="inline-flex items-center gap-1">
                        <Home className="size-3.5" aria-hidden="true" /> Home service
                        {s.homeServiceFee ? ` (+${formatPaise(s.homeServiceFee)})` : ""}
                      </span>
                    )}
                    {s.serviceMode !== "HOME" && (
                      <span className="inline-flex items-center gap-1">
                        <Store className="size-3.5" aria-hidden="true" /> Studio
                      </span>
                    )}
                  </p>
                  {s.includes.length > 0 && <p className="mt-1.5 text-xs text-muted">Includes: {s.includes.join(" · ")}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                  <p className="text-ink">
                    {s.priceType === "STARTING_AT" && <span className="text-xs text-muted">from </span>}
                    <span className="text-lg font-semibold">{formatPaise(s.price)}</span>
                  </p>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`${bookHref}?service=${s.id}`} aria-label={`Book ${s.name}`}>
                      Book
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function RatingSummary({ rating, count, distribution }: { rating: number; count: number; distribution: Record<number, number> }) {
  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-surface p-6 sm:flex-row sm:items-center">
      <div className="text-center sm:w-40">
        <p className="font-serif text-6xl leading-none text-primary">{count ? rating.toFixed(1) : "–"}</p>
        <Stars value={rating} className="mt-2 justify-center" />
        <p className="mt-1 text-xs text-muted">{count.toLocaleString("en-IN")} verified reviews</p>
      </div>
      <dl className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const n = distribution[star] ?? 0;
          const pct = count ? Math.round((n / count) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-3 text-xs">
              <dt className="w-6 text-muted">{star}★</dt>
              <dd className="flex flex-1 items-center gap-3">
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                  <span className="block h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-8 text-right text-muted">{pct}%</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

const reviewDate = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" });

export function ReviewCard({ review }: { review: ReviewDTO }) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-rose-soft text-sm font-semibold text-rose-deep" aria-hidden="true">
            {review.customerName[0]}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{review.customerName}</p>
            <p className="text-xs text-muted">
              {reviewDate.format(new Date(review.createdAt))}
              {review.serviceName ? ` · ${review.serviceName}` : ""}
            </p>
          </div>
        </div>
        <Stars value={review.rating} />
      </header>
      {review.comment && <p className="mt-3 text-sm leading-relaxed text-ink/90">{review.comment}</p>}
      {review.verified && (
        <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-success">
          <BadgeCheck className="size-3.5" aria-hidden="true" /> Verified booking
        </p>
      )}
      {review.reply && (
        <div className="mt-4 rounded-xl bg-blush p-3 text-sm">
          <p className="text-xs font-semibold text-primary">Response from the professional</p>
          <p className="mt-1 text-ink/85">{review.reply.text}</p>
        </div>
      )}
    </article>
  );
}

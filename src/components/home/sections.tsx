import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck, LocateFixed, Quote, Sparkles, TrendingUp } from "lucide-react";
import { CATEGORY_GROUPS } from "@/lib/catalog";
import { MARKETING } from "@/lib/marketing";
import { cn, formatPaise } from "@/lib/utils";
import type { CategoryDTO, ProviderCardDTO, ReviewDTO } from "@/types/dto";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/primitives";
import { Stars, VerifiedBadge } from "@/components/ui/display";
import { Reveal } from "@/components/ui/reveal";
import { ProviderCard } from "@/components/discovery/provider-card";
import { EmptyState, ErrorState, ImagePlaceholder } from "@/components/feedback/states";
import { NearbyActions } from "./nearby-actions";

type Loaded<T> = { ok: true; data: T } | { ok: false; error: string };

/* ── A. Categories ───────────────────────────────────────── */
export function CategoriesSection({ categories }: { categories: Loaded<CategoryDTO[]> }) {
  const groups = CATEGORY_GROUPS.filter((g) => g.key !== "styling").slice(0, 8);
  const imageFor = (group: string) => (categories.ok ? categories.data : []).find((c) => c.group === group && c.image)?.image;
  return (
    <section aria-labelledby="cat-title" className="container-page pt-4 pb-20 md:pb-28">
      <SectionHeading
        id="cat-title"
        eyebrow="Popular categories"
        title="What are you looking for?"
        action={
          <Link href="/categories" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            All categories <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
        {groups.map((g, i) => {
          const img = imageFor(g.key);
          return (
            <Reveal as="li" key={g.key} delay={i * 0.04}>
              <Link
                href={`/explore?group=${g.key}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-surface-sunken sm:aspect-[3/4]"
              >
                {img ? (
                  <>
                    <Image src={img.url} alt="" fill sizes="(min-width: 640px) 25vw, 50vw" className="object-cover transition duration-700 ease-(--ease-soft) group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2c0a18]/75 via-[#2c0a18]/5 to-transparent" />
                  </>
                ) : (
                  <ImagePlaceholder className="transition duration-700 group-hover:scale-105" />
                )}
                <div className={cn("absolute inset-x-0 bottom-0 p-4 sm:p-5", img ? "text-white" : "text-primary")}>
                  <h3 className={cn("font-serif text-2xl leading-none sm:text-[1.7rem]", img ? "text-white" : "text-primary")}>{g.name}</h3>
                  <p className={cn("mt-1.5 text-xs sm:text-sm", img ? "text-white/80" : "text-primary/70")}>{g.blurb}</p>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}

/* ── Provider rows (trending artists / salons / nearby) ─── */
export function ProviderRow({
  id,
  eyebrow,
  title,
  description,
  href,
  result,
  emptyTitle,
  priority,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  href: string;
  result: Loaded<ProviderCardDTO[]>;
  emptyTitle: string;
  priority?: boolean;
}) {
  return (
    <section aria-labelledby={id} className="container-page pb-20 md:pb-28">
      <SectionHeading
        id={id}
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href={href}>
              View all <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      {!result.ok ? (
        <ErrorState description={result.error} />
      ) : result.data.length === 0 ? (
        <EmptyState title={emptyTitle} description="Try another city or browse all professionals." action={{ label: "Explore", href: "/explore" }} />
      ) : (
        <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {result.data.map((p, i) => (
            <li key={p.id} className="w-[72%] shrink-0 snap-start sm:w-auto">
              <ProviderCard provider={p} priority={priority && i < 2} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function NearbyPrompt() {
  return (
    <section aria-labelledby="nearby-title" className="container-page pb-20 md:pb-28">
      <div className="flex flex-col items-start gap-6 rounded-3xl bg-surface p-8 shadow-card md:flex-row md:items-center md:justify-between md:p-10">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-rose-soft">
            <LocateFixed className="size-5 text-rose-deep" aria-hidden="true" />
          </span>
          <div>
            <h2 id="nearby-title" className="text-3xl">Beauty professionals near you</h2>
            <p className="mt-1 text-sm text-muted">Share your location or pick a city to see artists and salons nearby, with distances.</p>
          </div>
        </div>
        <NearbyActions />
      </div>
    </section>
  );
}

/* ── F. Offers ───────────────────────────────────────────── */
type OfferCard = {
  id: string;
  title: string;
  subtitle: string | null;
  code: string | null;
  discountType: string;
  discountValue: number;
  endsAt: string;
  image: { url: string } | null;
  isDemo: boolean;
};

export function OffersSection({ offers }: { offers: Loaded<OfferCard[]> }) {
  if (!offers.ok || offers.data.length === 0) return null;
  return (
    <section aria-labelledby="offers-title" className="container-page pb-20 md:pb-28">
      <SectionHeading id="offers-title" eyebrow="Offers" title="Little luxuries, better prices" />
      <ul className="grid gap-5 md:grid-cols-3">
        {offers.data.slice(0, 3).map((o, i) => (
          <Reveal as="li" key={o.id} delay={i * 0.06}>
            <article className="group relative flex h-full min-h-56 overflow-hidden rounded-3xl bg-primary text-white">
              {o.image && (
                <Image src={o.image.url} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover opacity-35 transition duration-700 group-hover:scale-105" />
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-transparent" />
              <div className="relative flex flex-col p-7">
                <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
                  {o.discountType === "PERCENT" ? `${o.discountValue}% off` : `${formatPaise(o.discountValue)} off`}
                </p>
                <h3 className="mt-3 font-serif text-[1.7rem] leading-tight text-white">{o.title}</h3>
                {o.subtitle && <p className="mt-2 text-sm text-white/80">{o.subtitle}</p>}
                {o.code && (
                  <p className="mt-auto pt-6 text-sm">
                    Use code{" "}
                    <span className="rounded-md border border-dashed border-gold/70 px-2 py-1 font-mono text-gold">{o.code}</span>
                  </p>
                )}
              </div>
            </article>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

/* ── G. Testimonials (real verified reviews only) ────────── */
export function TestimonialsSection({ reviews }: { reviews: Loaded<(ReviewDTO & { provider: { name: string; href: string } })[]> }) {
  if (!reviews.ok || reviews.data.length === 0) return null;
  return (
    <section aria-labelledby="love-title" className="bg-surface py-20 md:py-28">
      <div className="container-page">
        <SectionHeading id="love-title" eyebrow="Loved by women across India" title="Real bookings. Real words." className="text-center sm:block [&>div]:mx-auto" />
        <ul className="grid gap-5 md:grid-cols-3">
          {reviews.data.map((r, i) => (
            <Reveal as="li" key={r.id} delay={i * 0.06}>
              <figure className="flex h-full flex-col rounded-3xl bg-blush p-7">
                <Quote className="size-7 text-rose" aria-hidden="true" />
                <blockquote className="mt-4 flex-1 font-serif text-[1.35rem] leading-snug text-primary">“{r.comment}”</blockquote>
                <figcaption className="mt-6 flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="block font-semibold text-ink">{r.customerName}</span>
                    <span className="text-muted">
                      booked{" "}
                      <Link href={r.provider.href} className="text-primary hover:underline">
                        {r.provider.name}
                      </Link>
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <Stars value={r.rating} />
                    <span className="inline-flex items-center gap-1 text-[11px] text-success">
                      <BadgeCheck className="size-3.5" aria-hidden="true" /> Verified booking
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── H. Become a partner ─────────────────────────────────── */
export function PartnerCta() {
  const perks = [
    { icon: Sparkles, text: "A portfolio-first profile that sells your work" },
    { icon: CalendarCheck, text: "Bookings, calendar and payments in one place" },
    { icon: TrendingUp, text: "Get discovered by clients in your city" },
  ];
  return (
    <section aria-labelledby="partner-title" className="container-page pt-20 md:pt-28">
      <div className="grid overflow-hidden rounded-[2rem] bg-primary md:grid-cols-[1.1fr_1fr]">
        <div className="p-8 text-white sm:p-12 lg:p-16">
          <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">For beauty professionals</p>
          <h2 id="partner-title" className="mt-4 text-4xl leading-tight text-white sm:text-5xl">
            Turn your talent into your business.
          </h2>
          <ul className="mt-8 space-y-4">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/85">
                <span className="grid size-9 place-items-center rounded-full bg-white/10">
                  <Icon className="size-4 text-rose" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="light" size="lg">
              <Link href="/become-a-partner">Become a Partner</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="text-white hover:bg-white/10 hover:text-white">
              <Link href="/register?type=salon">List your salon</Link>
            </Button>
          </div>
        </div>
        <div className="relative min-h-72">
          <Image src={MARKETING.partner.url} alt={MARKETING.partner.alt} fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/60 to-transparent md:from-primary" />
          <div className="absolute right-6 bottom-6 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-primary shadow-lift">
            <VerifiedBadge /> Get the verified badge
          </div>
        </div>
      </div>
    </section>
  );
}

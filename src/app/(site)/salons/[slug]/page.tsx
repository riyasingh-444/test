import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { after } from "next/server";
import { CalendarCheck, Clock, Home, MapPin, Phone, Sparkles } from "lucide-react";
import { AppError } from "@/server/http/errors";
import { load } from "@/server/page-context";
import { connectDB } from "@/server/db/connection";
import { discoveryService } from "@/server/services/discovery.service";
import { Offer } from "@/server/models";
import { formatPaise, initials } from "@/lib/utils";
import type { ImageDTO } from "@/types/dto";
import { jsonLd, providerJsonLd } from "@/lib/seo";
import { todayKey, weekdayOf } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { DemoBadge, Rating, VerifiedBadge } from "@/components/ui/display";
import { SaveButton } from "@/components/discovery/save-button";
import { ProviderCard } from "@/components/discovery/provider-card";
import { ShareButton } from "@/components/profile/share-button";
import { PortfolioGallery } from "@/components/profile/portfolio-gallery";
import { AvailabilityPreview } from "@/components/profile/availability-preview";
import { RatingSummary, ServiceList } from "@/components/profile/profile-parts";
import { ReviewsList } from "@/components/profile/reviews-list";
import { LocationMap } from "@/components/profile/location-map";
import { ImagePlaceholder } from "@/components/feedback/states";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getSalon = cache(async (slug: string) => {
  await connectDB();
  try {
    return await discoveryService.getSalonProfile(slug);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
});

export async function generateMetadata({ params }: PageProps<"/salons/[slug]">): Promise<Metadata> {
  const s = await getSalon((await params).slug);
  const title = `${s.name} — Salon in ${s.area ? `${s.area}, ` : ""}${s.city}`;
  const description = `${s.headline ?? "Beauty salon"} · ${s.rating ? `${s.rating}★ from ${s.reviewCount} verified reviews · ` : ""}Services from ${formatPaise(s.startingPrice)}. Book on Rivya.`;
  return { title, description, alternates: { canonical: `/salons/${s.slug}` }, openGraph: { title, description, images: s.cover ? [{ url: s.cover.url }] : undefined } };
}

export default async function SalonPage({ params }: PageProps<"/salons/[slug]">) {
  const s = await getSalon((await params).slug);
  const [services, looks, reviews, offers] = await Promise.all([
    load(() => discoveryService.listServices("SALON", s.id)),
    load(() => discoveryService.listLooks({ providerId: s.id, limit: 24 })),
    load(() => discoveryService.listReviews(s.id, 1, 6)),
    load(() => Offer.find({ providerId: s.id, isActive: true, endsAt: { $gte: new Date() } }).limit(3).lean()),
  ]);
  after(() => discoveryService.recordProfileView("SALON", s.id).catch(() => undefined));

  const bookHref = `/book/salons/${s.slug}`;
  const svc = services.ok ? services.data : [];
  const gallery = [s.cover, ...s.images].filter((i): i is ImageDTO => Boolean(i)).slice(0, 5);
  const today = s.openingHours.find((h) => h.day === weekdayOf(todayKey()));

  return (
    <article className="pb-28 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(providerJsonLd({
        type: "SALON", name: s.name, url: `/salons/${s.slug}`, image: s.cover?.url, description: s.description, city: s.city, area: s.area,
        address: s.address, rating: s.rating, reviewCount: s.reviewCount, priceFrom: s.startingPrice, geo: s.location,
      }))} />

      {/* Gallery */}
      <div className="container-page pt-4 md:pt-6">
        <div className="relative grid h-72 gap-2 overflow-hidden rounded-[2rem] sm:h-96 md:grid-cols-4 md:grid-rows-2">
          {gallery.length === 0 ? (
            <ImagePlaceholder label={s.name} className="md:col-span-4 md:row-span-2" />
          ) : (
            gallery.map((img, i) => (
              <div key={img.url} className={i === 0 ? "relative md:col-span-2 md:row-span-2" : "relative hidden md:block"}>
                <Image src={img.url} alt={img.alt ?? `${s.name} photo ${i + 1}`} fill priority={i === 0} sizes={i === 0 ? "(min-width: 768px) 50vw, 100vw" : "25vw"} className="object-cover" />
              </div>
            ))
          )}
          {s.isDemo && <DemoBadge className="absolute top-4 left-4" />}
        </div>
      </div>

      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <header className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary text-xl font-semibold text-white">
                  {s.avatar ? <Image src={s.avatar.url} alt="" fill sizes="64px" className="object-cover" /> : initials(s.name)}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-4xl leading-none sm:text-5xl">{s.name}</h1>
                    {s.verified && <VerifiedBadge className="[&_svg]:size-6" />}
                  </div>
                  {s.headline && <p className="mt-2 text-muted">{s.headline}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShareButton title={s.name} />
                <SaveButton type="SALON" id={s.id} label={s.name} variant="plain" className="size-10 border border-line bg-surface" />
              </div>
            </header>

            <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink">
              <li><Rating value={s.rating} count={s.reviewCount} size="md" /></li>
              <li className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-rose-deep" aria-hidden="true" />{s.area ? `${s.area}, ` : ""}{s.city}</li>
              {today && (
                <li className="inline-flex items-center gap-1.5">
                  <Clock className="size-4 text-rose-deep" aria-hidden="true" />
                  {today.isOpen ? <>Open today · {today.open}–{today.close}</> : "Closed today"}
                </li>
              )}
              {s.offersHomeService && <li className="inline-flex items-center gap-1.5"><Home className="size-4 text-rose-deep" aria-hidden="true" />Home service available</li>}
            </ul>

            {offers.ok && offers.data.length > 0 && (
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {offers.data.map((o) => (
                  <li key={String(o._id)} className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold-soft/60 p-4">
                    <Sparkles className="size-5 text-gold-deep" aria-hidden="true" />
                    <div className="text-sm"><p className="font-semibold text-ink">{o.title}</p>{o.code && <p className="text-muted">Code <span className="font-mono text-ink">{o.code}</span></p>}</div>
                  </li>
                ))}
              </ul>
            )}

            <section aria-labelledby="about-h" className="pt-12">
              <h2 id="about-h" className="mb-4 text-3xl">About</h2>
              {s.description && <p className="max-w-2xl leading-relaxed text-ink/85">{s.description}</p>}
              {s.amenities.length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {s.amenities.map((a) => <li key={a} className="rounded-full bg-surface px-3 py-1.5 text-xs text-ink shadow-xs">{a}</li>)}
                </ul>
              )}
            </section>

            <section aria-labelledby="services-h" className="pt-14">
              <h2 id="services-h" className="mb-6 text-3xl">Services & pricing</h2>
              {services.ok ? <ServiceList services={svc} bookHref={bookHref} /> : <p className="text-sm text-danger">{services.error}</p>}
            </section>

            {looks.ok && looks.data.items.length > 0 && (
              <section aria-labelledby="photos-h" className="pt-14">
                <h2 id="photos-h" className="mb-6 text-3xl">Work & photos</h2>
                <Suspense>
                  <PortfolioGallery providerId={s.id} initial={looks.data.items} initialCursor={looks.data.nextCursor} bookHref={bookHref} deepLinkedLook={null} />
                </Suspense>
              </section>
            )}

            {s.staff.length > 0 && (
              <section aria-labelledby="staff-h" className="pt-14">
                <h2 id="staff-h" className="mb-6 text-3xl">Artists at {s.name}</h2>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {s.staff.map((a) => <li key={a.id}><ProviderCard provider={a} /></li>)}
                </ul>
              </section>
            )}

            <section aria-labelledby="avail-h" className="pt-14 lg:hidden">
              <h2 id="avail-h" className="mb-6 text-3xl">Availability</h2>
              <AvailabilityPreview services={svc} bookHref={bookHref} />
            </section>

            <section aria-labelledby="hours-h" className="grid gap-8 pt-14 md:grid-cols-2">
              <div>
                <h2 id="hours-h" className="mb-4 text-3xl">Opening hours</h2>
                <dl className="divide-y divide-line rounded-2xl bg-surface px-5">
                  {s.openingHours.slice().sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7)).map((h) => (
                    <div key={h.day} className={`flex justify-between py-3 text-sm ${h.day === today?.day ? "font-semibold text-primary" : "text-ink"}`}>
                      <dt>{DAYS[h.day]}</dt>
                      <dd>{h.isOpen ? `${h.open} – ${h.close}` : "Closed"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <h2 className="mb-4 text-3xl">Location</h2>
                <LocationMap lat={s.location.lat} lng={s.location.lng} name={s.name} address={s.address} />
                {s.contactPhone && (
                  <a href={`tel:${s.contactPhone}`} className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    <Phone className="size-4" aria-hidden="true" /> {s.contactPhone}
                  </a>
                )}
              </div>
            </section>

            <section aria-labelledby="reviews-h" className="pt-14">
              <h2 id="reviews-h" className="mb-6 text-3xl">Reviews</h2>
              {reviews.ok ? (
                <div className="space-y-6">
                  <RatingSummary rating={s.rating} count={reviews.data.total} distribution={reviews.data.distribution} />
                  <ReviewsList providerId={s.id} initial={reviews.data.items} total={reviews.data.total} />
                </div>
              ) : <p className="text-sm text-danger">{reviews.error}</p>}
            </section>
          </div>

          <aside className="hidden lg:block" aria-label="Book">
            <div className="sticky top-28 mt-8 rounded-3xl bg-surface p-6 shadow-lift">
              <p className="text-sm text-muted">Services from</p>
              <p className="font-serif text-4xl text-primary">{formatPaise(s.startingPrice)}</p>
              <Button asChild size="lg" className="mt-5 w-full">
                <Link href={bookHref}><CalendarCheck aria-hidden="true" /> Book now</Link>
              </Button>
              <hr className="my-6 border-line" />
              <h2 className="mb-4 font-sans text-sm font-semibold text-ink">Check availability</h2>
              <AvailabilityPreview services={svc} bookHref={bookHref} />
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <p className="text-sm"><span className="text-muted">From </span><span className="text-lg font-semibold text-ink">{formatPaise(s.startingPrice)}</span></p>
          <Button asChild><Link href={bookHref}>Book now</Link></Button>
        </div>
      </div>
    </article>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { after } from "next/server";
import { Briefcase, CalendarCheck, Home, AtSign, Languages, MapPin, ShieldCheck, Store } from "lucide-react";
import { AppError } from "@/server/http/errors";
import { load } from "@/server/page-context";
import { discoveryService } from "@/server/services/discovery.service";
import { connectDB } from "@/server/db/connection";
import { formatPaise, initials } from "@/lib/utils";
import { jsonLd, providerJsonLd } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { DemoBadge, Rating, VerifiedBadge } from "@/components/ui/display";
import { SaveButton } from "@/components/discovery/save-button";
import { ShareButton } from "@/components/profile/share-button";
import { PortfolioGallery } from "@/components/profile/portfolio-gallery";
import { AvailabilityPreview } from "@/components/profile/availability-preview";
import { RatingSummary, ServiceList } from "@/components/profile/profile-parts";
import { ReviewsList } from "@/components/profile/reviews-list";
import { ImagePlaceholder } from "@/components/feedback/states";

// Memoised per request: generateMetadata and the page share one lookup.
const getArtist = cache(async (slug: string) => {
  await connectDB();
  try {
    return await discoveryService.getArtistProfile(slug);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
});

export async function generateMetadata({ params }: PageProps<"/artists/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArtist(slug);
  const title = `${a.name} — ${a.categories[0] ?? "Beauty Artist"} in ${a.area ? `${a.area}, ` : ""}${a.city}`;
  const description = `${a.headline ?? "Beauty professional"} · ${a.rating ? `${a.rating}★ from ${a.reviewCount} verified reviews · ` : ""}From ${formatPaise(a.startingPrice)}. View portfolio and book on Rivya.`;
  return {
    title,
    description,
    alternates: { canonical: `/artists/${a.slug}` },
    openGraph: { title, description, images: a.cover ? [{ url: a.cover.url }] : undefined, type: "profile" },
  };
}

const SECTIONS = [
  { id: "portfolio", label: "Portfolio" },
  { id: "services", label: "Services" },
  { id: "availability", label: "Availability" },
  { id: "about", label: "About" },
  { id: "reviews", label: "Reviews" },
  { id: "policies", label: "Policies" },
];

export default async function ArtistPage({ params, searchParams }: PageProps<"/artists/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const a = await getArtist(slug);
  const lookId = typeof sp.look === "string" && /^[a-f\d]{24}$/i.test(sp.look) ? sp.look : null;

  const [services, looks, reviews, deepLook] = await Promise.all([
    load(() => discoveryService.listServices("ARTIST", a.id)),
    load(() => discoveryService.listLooks({ providerId: a.id, limit: 24 })),
    load(() => discoveryService.listReviews(a.id, 1, 6)),
    lookId ? load(() => discoveryService.getLook(lookId)) : Promise.resolve(null),
  ]);
  after(() => discoveryService.recordProfileView("ARTIST", a.id).catch(() => undefined));

  const bookHref = `/book/artists/${a.slug}`;
  const svc = services.ok ? services.data : [];

  return (
    <article className="pb-28 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(providerJsonLd({
        type: "ARTIST", name: a.name, url: `/artists/${a.slug}`, image: a.cover?.url, description: a.bio, city: a.city, area: a.area,
        rating: a.rating, reviewCount: a.reviewCount, priceFrom: a.startingPrice, geo: a.location,
      }))} />

      {/* Cover */}
      <div className="container-page pt-4 md:pt-6">
        <div className="relative h-64 overflow-hidden rounded-[2rem] bg-surface-sunken sm:h-80 lg:h-[26rem]">
          {a.cover ? (
            <Image src={a.cover.url} alt={a.cover.alt ?? `Work by ${a.name}`} fill priority sizes="100vw" className="object-cover" />
          ) : (
            <ImagePlaceholder label={a.name} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#2c0a18]/40 to-transparent" />
          {a.isDemo && <DemoBadge className="absolute top-4 left-4" />}
        </div>
      </div>

      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            {/* Identity */}
            <header className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <span className="relative -mt-14 grid size-28 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-blush bg-primary-soft font-serif text-3xl text-primary shadow-lift sm:-mt-16 sm:size-32">
                  {a.avatar ? <Image src={a.avatar.url} alt={a.name} fill sizes="128px" className="object-cover" /> : initials(a.name)}
                </span>
                <div className="pb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-4xl leading-none sm:text-5xl">{a.name}</h1>
                    {a.verified && <VerifiedBadge className="[&_svg]:size-6" />}
                  </div>
                  {a.headline && <p className="mt-2 text-muted">{a.headline}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShareButton title={a.name} />
                <SaveButton type="ARTIST" id={a.id} label={a.name} variant="plain" className="size-10 border border-line bg-surface" />
              </div>
            </header>

            <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink">
              <li><Rating value={a.rating} count={a.reviewCount} size="md" /></li>
              <li className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-rose-deep" aria-hidden="true" />{a.area ? `${a.area}, ` : ""}{a.city}</li>
              {a.experienceYears ? <li className="inline-flex items-center gap-1.5"><Briefcase className="size-4 text-rose-deep" aria-hidden="true" />{a.experienceYears} years experience</li> : null}
              {a.serviceMode !== "STUDIO" && <li className="inline-flex items-center gap-1.5"><Home className="size-4 text-rose-deep" aria-hidden="true" />Home service{a.serviceRadiusKm ? ` within ${a.serviceRadiusKm} km` : ""}</li>}
              {a.serviceMode !== "HOME" && <li className="inline-flex items-center gap-1.5"><Store className="size-4 text-rose-deep" aria-hidden="true" />Studio</li>}
            </ul>
            {a.categories.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {a.categories.map((c) => <li key={c} className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">{c}</li>)}
              </ul>
            )}

            {/* Section nav */}
            <nav aria-label="Profile sections" className="scrollbar-none sticky top-16 z-30 -mx-4 mt-8 flex gap-1 overflow-x-auto border-b border-line bg-blush/90 px-4 backdrop-blur lg:top-[72px] lg:mx-0 lg:px-0">
              {SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted transition hover:border-primary/40 hover:text-primary">
                  {s.label}
                </a>
              ))}
            </nav>

            <section id="portfolio" aria-labelledby="portfolio-h" className="scroll-mt-32 pt-10">
              <h2 id="portfolio-h" className="mb-6 text-3xl">Portfolio</h2>
              {looks.ok ? (
                <Suspense>
                  <PortfolioGallery
                    providerId={a.id}
                    initial={looks.data.items}
                    initialCursor={looks.data.nextCursor}
                    bookHref={bookHref}
                    deepLinkedLook={deepLook?.ok ? deepLook.data : null}
                  />
                </Suspense>
              ) : <p className="text-sm text-danger">{looks.error}</p>}
            </section>

            <section id="services" aria-labelledby="services-h" className="scroll-mt-32 pt-14">
              <h2 id="services-h" className="mb-6 text-3xl">Services & pricing</h2>
              {services.ok ? <ServiceList services={svc} bookHref={bookHref} /> : <p className="text-sm text-danger">{services.error}</p>}
            </section>

            <section id="availability" aria-labelledby="avail-h" className="scroll-mt-32 pt-14 lg:hidden">
              <h2 id="avail-h" className="mb-6 text-3xl">Availability</h2>
              <AvailabilityPreview services={svc} bookHref={bookHref} />
            </section>

            <section id="about" aria-labelledby="about-h" className="scroll-mt-32 pt-14">
              <h2 id="about-h" className="mb-4 text-3xl">About {a.name.split(" ")[0]}</h2>
              {a.bio && <p className="max-w-2xl leading-relaxed whitespace-pre-line text-ink/85">{a.bio}</p>}
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {a.languages.length > 0 && (
                  <div className="flex gap-3 rounded-2xl bg-surface p-4">
                    <Languages className="mt-0.5 size-5 text-rose-deep" aria-hidden="true" />
                    <div><dt className="text-xs text-muted">Languages</dt><dd className="text-sm font-medium">{a.languages.join(", ")}</dd></div>
                  </div>
                )}
                {a.salon && (
                  <div className="flex gap-3 rounded-2xl bg-surface p-4">
                    <Store className="mt-0.5 size-5 text-rose-deep" aria-hidden="true" />
                    <div><dt className="text-xs text-muted">Works at</dt><dd className="text-sm font-medium"><Link href={`/salons/${a.salon.slug}`} className="text-primary hover:underline">{a.salon.name}</Link></dd></div>
                  </div>
                )}
                {a.socialLinks?.instagram && (
                  <div className="flex gap-3 rounded-2xl bg-surface p-4">
                    <AtSign className="mt-0.5 size-5 text-rose-deep" aria-hidden="true" />
                    <div><dt className="text-xs text-muted">Instagram</dt><dd className="text-sm font-medium"><a href={a.socialLinks.instagram} target="_blank" rel="noopener noreferrer nofollow" className="text-primary hover:underline">View profile</a></dd></div>
                  </div>
                )}
                <div className="flex gap-3 rounded-2xl bg-surface p-4">
                  <ShieldCheck className="mt-0.5 size-5 text-rose-deep" aria-hidden="true" />
                  <div><dt className="text-xs text-muted">Verification</dt><dd className="text-sm font-medium">{a.verified ? "Identity & work verified by Rivya" : "Verification in progress"}</dd></div>
                </div>
              </dl>
            </section>

            <section id="reviews" aria-labelledby="reviews-h" className="scroll-mt-32 pt-14">
              <h2 id="reviews-h" className="mb-6 text-3xl">Reviews</h2>
              {reviews.ok ? (
                <div className="space-y-6">
                  <RatingSummary rating={a.rating} count={reviews.data.total} distribution={reviews.data.distribution} />
                  <ReviewsList providerId={a.id} initial={reviews.data.items} total={reviews.data.total} />
                </div>
              ) : <p className="text-sm text-danger">{reviews.error}</p>}
            </section>

            <section id="policies" aria-labelledby="policies-h" className="scroll-mt-32 pt-14">
              <h2 id="policies-h" className="mb-4 text-3xl">Policies</h2>
              <div className="space-y-3 text-sm leading-relaxed text-ink/85">
                <p><span className="font-medium text-ink">Cancellation. </span>{a.policies?.cancellation ?? "Free cancellation up to 24 hours before your appointment."}</p>
                {a.policies?.advancePercent != null && a.policies.advancePercent < 100 && (
                  <p><span className="font-medium text-ink">Advance. </span>{a.policies.advancePercent}% advance may be requested to confirm large bookings.</p>
                )}
                {a.policies?.travelNote && <p><span className="font-medium text-ink">Travel. </span>{a.policies.travelNote}</p>}
              </div>
            </section>
          </div>

          {/* Sticky booking card (desktop) */}
          <aside className="hidden lg:block" aria-label="Book">
            <div className="sticky top-28 mt-8 rounded-3xl bg-surface p-6 shadow-lift">
              <p className="text-sm text-muted">Starting from</p>
              <p className="font-serif text-4xl text-primary">{formatPaise(a.startingPrice)}</p>
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

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <p className="text-sm"><span className="text-muted">From </span><span className="text-lg font-semibold text-ink">{formatPaise(a.startingPrice)}</span></p>
          <Button asChild><Link href={bookHref}>Book now</Link></Button>
        </div>
      </div>
    </article>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CITIES, findCity } from "@/lib/catalog";
import { providerSearchSchema } from "@/lib/validation/discovery";
import { Artist, Salon } from "@/server/models";
import { load, getUserLocation } from "@/server/page-context";
import { searchService } from "@/server/search/mongo";
import { discoveryService } from "@/server/services/discovery.service";
import { offerService } from "@/server/services/offer.service";
import { Hero } from "@/components/home/hero";
import {
  CategoriesSection,
  NearbyPrompt,
  OffersSection,
  PartnerCta,
  ProviderRow,
  TestimonialsSection,
} from "@/components/home/sections";
import { LooksExplorer } from "@/components/discovery/looks-explorer";
import { SectionHeading } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/states";

// Personalised by location cookie — render per request.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const loc = await getUserLocation();
  const citySlug = findCity(loc?.city)?.slug;
  const hasGeo = loc?.lat != null && loc?.lng != null;
  const q = (over: Record<string, unknown>) => providerSearchSchema.parse(over);

  const [stats, categories, trending, looks, nearby, salons, offers, reviews] = await Promise.all([
    load(async () => ({ artists: await Artist.countDocuments({ isActive: true }) + (await Salon.countDocuments({ isActive: true })), cities: CITIES.length })),
    load(() => discoveryService.listCategories()),
    load(async () => {
      const res = await searchService.searchProviders("ARTIST", q({ city: citySlug, sort: "recommended", limit: 8 }));
      // Fall back to national results when the city has no artists yet.
      return res.items.length ? res.items : (await searchService.searchProviders("ARTIST", q({ sort: "recommended", limit: 8 }))).items;
    }),
    load(() => discoveryService.listLooks({ limit: 12 })),
    hasGeo
      ? load(async () => (await searchService.searchProviders("ARTIST", q({ lat: loc.lat, lng: loc.lng, radiusKm: 20, sort: "nearest", limit: 4 }))).items)
      : citySlug
        ? load(async () => (await searchService.searchProviders("ARTIST", q({ city: citySlug, sort: "rating", limit: 4 }))).items)
        : Promise.resolve(null),
    load(async () => (await searchService.searchProviders("SALON", q({ city: citySlug, sort: "rating", limit: 4 }))).items),
    load(() => offerService.listActive(3)),
    load(() => discoveryService.featuredReviews(3)),
  ]);

  const cityLabel = loc?.city ?? null;
  const nearbyHref = hasGeo ? `/explore?lat=${loc.lat}&lng=${loc.lng}&sort=nearest` : `/explore?city=${citySlug ?? ""}`;

  return (
    <>
      <Hero stats={stats.ok ? stats.data : null} />
      <CategoriesSection categories={categories} />

      <ProviderRow
        id="trending-title"
        eyebrow="Trending artists"
        title={cityLabel ? `Loved in ${cityLabel}` : "Artists everyone's booking"}
        description="Ranked by verified reviews, bookings and verification — never paid placement."
        href={`/explore?type=artists${citySlug ? `&city=${citySlug}` : ""}`}
        result={trending}
        emptyTitle="No artists here yet"
        priority
      />

      <section aria-labelledby="looks-title" className="container-page pb-20 md:pb-28">
        <SectionHeading
          id="looks-title"
          eyebrow="Explore looks"
          title="Discover artists through their work"
          description="Tap any look to see the artist behind it — and book the same look."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href="/looks">
                All looks <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          }
        />
        {!looks.ok ? (
          <ErrorState description={looks.error} />
        ) : (
          <LooksExplorer initial={looks.data.items} initialCursor={null} />
        )}
      </section>

      {nearby ? (
        <ProviderRow
          id="nearby-title"
          eyebrow={hasGeo ? "Near you" : `In ${cityLabel}`}
          title="Beauty professionals nearby"
          href={nearbyHref}
          result={nearby}
          emptyTitle="No professionals nearby yet"
        />
      ) : (
        <NearbyPrompt />
      )}

      <ProviderRow
        id="salons-title"
        eyebrow="Popular salons"
        title={cityLabel ? `Top salons in ${cityLabel}` : "Salons worth the visit"}
        href={`/explore?type=salons${citySlug ? `&city=${citySlug}` : ""}`}
        result={salons}
        emptyTitle="No salons here yet"
      />

      <OffersSection offers={offers} />
      <TestimonialsSection reviews={reviews} />
      <PartnerCta />
    </>
  );
}

import type { Metadata } from "next";
import { findCity } from "@/lib/catalog";
import { getUserLocation, load } from "@/server/page-context";
import { discoveryService } from "@/server/services/discovery.service";
import { LooksExplorer } from "@/components/discovery/looks-explorer";
import { ErrorState } from "@/components/feedback/states";

export const metadata: Metadata = {
  title: "Explore Looks",
  description: "Browse bridal, glam, natural and traditional looks by real artists — and book the artist behind any look.",
};

export default async function LooksPage() {
  const loc = await getUserLocation();
  const city = findCity(loc?.city)?.name;
  const looks = await load(() => discoveryService.listLooks({ limit: 24, city }));
  // If the city has no looks yet, show the national feed rather than an empty page.
  const feed = looks.ok && looks.data.items.length === 0 && city ? await load(() => discoveryService.listLooks({ limit: 24 })) : looks;
  const scopedCity = feed === looks ? city : undefined;
  return (
    <div className="container-page pt-8 md:pt-12">
      <header className="mb-8 max-w-2xl">
        <p className="eyebrow">Explore looks{scopedCity ? ` · ${scopedCity}` : ""}</p>
        <h1 className="mt-3 text-5xl md:text-6xl">Find the look. Meet the artist.</h1>
        <p className="mt-4 text-muted">Every look here was created by a professional on Rivya. Tap one to see their portfolio, prices and availability.</p>
      </header>
      {feed.ok ? (
        <LooksExplorer initial={feed.data.items} initialCursor={feed.data.nextCursor} infinite city={scopedCity} pageSize={24} />
      ) : (
        <ErrorState description={feed.error} />
      )}
    </div>
  );
}

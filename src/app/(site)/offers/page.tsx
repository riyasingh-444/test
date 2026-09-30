import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { load } from "@/server/page-context";
import { offerService } from "@/server/services/offer.service";
import { OffersSection } from "@/components/home/sections";
import { EmptyState } from "@/components/feedback/states";

export const metadata: Metadata = { title: "Offers", description: "Current offers and codes on beauty services booked through Rivya." };

export default async function OffersPage() {
  const offers = await load(() => offerService.listActive(24));
  return (
    <div className="pt-8 md:pt-12">
      <header className="container-page mb-2 max-w-2xl">
        <p className="eyebrow">Offers</p>
        <h1 className="mt-3 text-5xl md:text-6xl">Treat yourself, for less</h1>
        <p className="mt-4 text-muted">Apply a code at checkout. Terms such as minimum order value and category apply per offer.</p>
      </header>
      {offers.ok && offers.data.length === 0 ? (
        <div className="container-page mt-10"><EmptyState icon={Tag} title="No live offers right now" description="Check back soon — new offers drop often." action={{ label: "Explore artists", href: "/explore" }} /></div>
      ) : (
        <div className="mt-10"><OffersSection offers={offers} /></div>
      )}
    </div>
  );
}

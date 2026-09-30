import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { WishlistTarget } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/current-user";
import { load } from "@/server/page-context";
import { wishlistService } from "@/server/services/wishlist.service";
import { ProviderCard } from "@/components/discovery/provider-card";
import { LookCard, MasonryGrid } from "@/components/discovery/look-card";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

const TABS: { key: WishlistTarget; label: string; empty: string }[] = [
  { key: "ARTIST", label: "Artists", empty: "Tap the heart on any artist to save them here." },
  { key: "SALON", label: "Salons", empty: "Save salons you'd like to visit." },
  { key: "LOOK", label: "Looks", empty: "Save looks for inspiration — and book the artist later." },
];

export default async function WishlistPage({ searchParams }: PageProps<"/account/wishlist">) {
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key.toLowerCase() === sp.type) ?? TABS[0]!;
  const page = Math.max(1, Number(sp.page) || 1);
  const user = await requireUser();
  const res = await load(() => wishlistService.list(user, { type: tab.key, page, limit: 24 }));
  return (
    <div>
      <h1 className="text-4xl md:text-5xl">Wishlist</h1>
      <nav aria-label="Wishlist type" className="mt-6 flex gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={`/account/wishlist?type=${t.key.toLowerCase()}`} aria-current={tab.key === t.key ? "page" : undefined}
            className={cn("rounded-full px-4 py-2 text-sm font-medium transition", tab.key === t.key ? "bg-primary text-white" : "bg-surface text-ink hover:text-primary")}>
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">
        {!res.ok ? (
          <ErrorState description={res.error} />
        ) : res.data.items.length === 0 ? (
          <EmptyState icon={Heart} title={`No saved ${tab.label.toLowerCase()} yet`} description={tab.empty} action={{ label: tab.key === "LOOK" ? "Explore looks" : "Explore", href: tab.key === "LOOK" ? "/looks" : `/explore?type=${tab.key === "SALON" ? "salons" : "artists"}` }} />
        ) : tab.key === "LOOK" ? (
          <MasonryGrid className="lg:columns-3">
            {res.data.items.flatMap((i) => (i.look ? [<LookCard key={i.id} look={i.look} />] : []))}
          </MasonryGrid>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 xl:grid-cols-3">
            {res.data.items.flatMap((i) => (i.provider ? [<li key={i.id}><ProviderCard provider={i.provider} /></li>] : []))}
          </ul>
        )}
        {res.ok && <Pagination page={page} total={res.data.total} limit={24} basePath="/account/wishlist" searchParams={sp} />}
      </div>
    </div>
  );
}

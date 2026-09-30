import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { CATEGORY_GROUPS, findCity, LAUNCH_CATEGORIES } from "@/lib/catalog";
import { providerSearchSchema } from "@/lib/validation/discovery";
import { cn } from "@/lib/utils";
import { load } from "@/server/page-context";
import { searchService } from "@/server/search/mongo";
import { ProviderCard } from "@/components/discovery/provider-card";
import { ExploreFilters, SortSelect } from "@/components/discovery/explore-filters";
import { SearchBar } from "@/components/discovery/search-bar";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Pagination } from "@/components/ui/pagination";

type SP = Record<string, string | string[] | undefined>;

function describe(sp: SP) {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const category = LAUNCH_CATEGORIES.find((c) => c.slug === one("category"))?.name ?? CATEGORY_GROUPS.find((g) => g.key === one("group"))?.name;
  const city = findCity(one("city"))?.name;
  const what = category ?? (one("q") ? `“${one("q")}”` : one("type") === "salons" ? "Salons" : "Beauty professionals");
  return { title: `${what}${city ? ` in ${city}` : ""}`, category, city };
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const { title } = describe(await searchParams);
  return { title, description: `Compare portfolios, prices and verified reviews for ${title.toLowerCase()} on Rivya.` };
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const type = sp.type === "salons" ? "salons" : "artists";
  const parsed = providerSearchSchema.safeParse(sp);
  const params = parsed.success ? parsed.data : providerSearchSchema.parse({});
  const result = await load(() => searchService.searchProviders(type === "salons" ? "SALON" : "ARTIST", params));
  const { title } = describe(sp);

  const tabHref = (t: "artists" | "salons") => {
    const next = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && k !== "page" ? [[k, v]] : [])));
    next.set("type", t);
    if (t === "salons") next.delete("minExperience");
    return `/explore?${next.toString()}`;
  };

  return (
    <div className="container-page pt-6 md:pt-10">
      <div className="mb-8 hidden md:block">
        <Suspense>
          <SearchBar variant="inline" defaultQuery={typeof sp.q === "string" ? sp.q : ""} />
        </Suspense>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl">{title}</h1>
          {result.ok && (
            <p className="mt-2 text-sm text-muted" aria-live="polite">
              {result.data.total.toLocaleString("en-IN")} {type === "salons" ? "salons" : "professionals"} found
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <nav aria-label="Result type" className="flex rounded-full bg-surface p-1 shadow-xs">
            {(["artists", "salons"] as const).map((t) => (
              <Link
                key={t}
                href={tabHref(t)}
                aria-current={type === t ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition",
                  type === t ? "bg-primary text-white" : "text-ink hover:text-primary",
                )}
              >
                {t}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <Suspense>
          <ExploreFilters type={type} />
        </Suspense>
        <section aria-label="Results">
          <div className="mb-5 flex items-center justify-between gap-3 lg:justify-end">
            <div className="lg:hidden" />
            <Suspense>
              <SortSelect />
            </Suspense>
          </div>

          {!parsed.success && (
            <p className="mb-4 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">Some filters were invalid and have been ignored.</p>
          )}

          {!result.ok ? (
            <ErrorState description={result.error} />
          ) : result.data.items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={type === "salons" ? "No salons found" : "No artists found"}
              description="Try widening your filters, another city, or a different service."
              action={{ label: "Clear filters", href: `/explore?type=${type}` }}
            />
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 xl:grid-cols-3">
                {result.data.items.map((p, i) => (
                  <li key={p.id}>
                    <ProviderCard provider={p} priority={i < 3} />
                  </li>
                ))}
              </ul>
              <Pagination page={result.data.page} total={result.data.total} limit={result.data.limit} searchParams={sp} basePath="/explore" />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

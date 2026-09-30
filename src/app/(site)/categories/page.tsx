import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CATEGORY_GROUPS } from "@/lib/catalog";
import { load } from "@/server/page-context";
import { discoveryService } from "@/server/services/discovery.service";
import { ErrorState, ImagePlaceholder } from "@/components/feedback/states";

export const metadata: Metadata = { title: "All categories", description: "Bridal, makeup, hair, nails, mehendi, skincare, spa and more — browse every beauty service on Rivya." };

export default async function CategoriesPage() {
  const cats = await load(() => discoveryService.listCategories());
  return (
    <div className="container-page pt-8 md:pt-12">
      <header className="mb-10 max-w-2xl">
        <p className="eyebrow">Categories</p>
        <h1 className="mt-3 text-5xl md:text-6xl">Every kind of beautiful</h1>
      </header>
      {!cats.ok ? (
        <ErrorState description={cats.error} />
      ) : (
        <div className="space-y-12">
          {CATEGORY_GROUPS.map((g) => {
            const list = cats.data.filter((c) => c.group === g.key);
            if (list.length === 0) return null;
            return (
              <section key={g.key} aria-labelledby={`g-${g.key}`}>
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 id={`g-${g.key}`} className="text-3xl">{g.name}</h2>
                  <Link href={`/explore?group=${g.key}`} className="text-sm font-medium text-primary hover:underline">See all {g.name.toLowerCase()}</Link>
                </div>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {list.map((c) => (
                    <li key={c.id}>
                      <Link href={`/explore?category=${c.slug}`} className="group block">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-sunken">
                          {c.image ? (
                            <Image src={c.image.url} alt="" fill sizes="(min-width: 1024px) 20vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />
                          ) : (
                            <ImagePlaceholder />
                          )}
                        </div>
                        <p className="mt-2 text-sm font-medium text-ink group-hover:text-primary">{c.name}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

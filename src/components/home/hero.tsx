import Image from "next/image";
import { BadgeCheck, Star } from "lucide-react";
import { MARKETING } from "@/lib/marketing";
import { SearchBar } from "@/components/discovery/search-bar";

export function Hero({ stats }: { stats: { artists: number; cities: number } | null }) {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* soft crescent glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 size-[38rem] rounded-full bg-[radial-gradient(circle,var(--color-rose-soft)_0%,transparent_65%)]"
      />
      <div className="container-page relative grid items-center gap-12 pt-8 pb-16 md:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24">
        <div className="relative z-10">
          <div>
            <p className="eyebrow">India&apos;s beauty discovery platform</p>
            <h1 id="hero-title" className="mt-5 text-display text-primary">
              Find your perfect <em className="font-normal text-rose-deep italic">beauty</em> artist.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Discover trusted beauty professionals, explore their work, and book your perfect look.
            </p>
          </div>
          {stats && stats.artists > 0 && (
            <div>
              <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="size-4 text-primary" aria-hidden="true" />
                  <dt className="sr-only">Professionals</dt>
                  <dd>
                    <span className="font-semibold text-ink">{stats.artists.toLocaleString("en-IN")}+</span> professionals
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="size-4 fill-gold text-gold" aria-hidden="true" />
                  <dt className="sr-only">Reviews</dt>
                  <dd>Only verified-booking reviews</dd>
                </div>
                <div>
                  <dt className="sr-only">Cities</dt>
                  <dd>
                    <span className="font-semibold text-ink">{stats.cities}</span> cities
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {/* Editorial collage */}
        <div className="relative mx-auto hidden w-full max-w-xl sm:block" aria-hidden="true">
          <div className="grid grid-cols-[1.35fr_1fr] gap-4">
            <div className="relative row-span-2 aspect-[3/4] overflow-hidden rounded-[2rem] rounded-tl-[7rem] shadow-float">
              <Image src={MARKETING.heroMain.url} alt="" fill priority sizes="(min-width: 1024px) 28vw, 50vw" className="object-cover" />
            </div>
            <div className="relative mt-10 aspect-[4/5] overflow-hidden rounded-[1.75rem] shadow-lift">
              <Image src={MARKETING.heroTop.url} alt="" fill sizes="20vw" className="object-cover" />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-[1.75rem] rounded-br-[5rem] shadow-lift">
              <Image src={MARKETING.heroBottom.url} alt="" fill sizes="20vw" className="object-cover" />
            </div>
          </div>
          <div className="absolute -bottom-5 left-6 flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-lift backdrop-blur">
            <span className="grid size-9 place-items-center rounded-full bg-primary-soft">
              <BadgeCheck className="size-5 text-primary" />
            </span>
            <span className="text-sm">
              <span className="block font-semibold text-ink">Verified artists</span>
              <span className="text-muted">Real work. Real reviews.</span>
            </span>
          </div>
        </div>

        <div className="relative z-20 lg:col-span-2 lg:-mt-4">
          <SearchBar className="mx-auto max-w-5xl" />
        </div>
      </div>
    </section>
  );
}

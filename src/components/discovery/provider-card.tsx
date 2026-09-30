import Image from "next/image";
import Link from "next/link";
import { Home, MapPin, Store } from "lucide-react";
import type { ProviderCardDTO } from "@/types/dto";
import { cn, formatDistance, initials } from "@/lib/utils";
import { DemoBadge, PriceDisplay, Rating, VerifiedBadge } from "@/components/ui/display";
import { ImagePlaceholder } from "@/components/feedback/states";
import { SaveButton } from "./save-button";

export function providerHref(p: Pick<ProviderCardDTO, "type" | "slug">) {
  return p.type === "ARTIST" ? `/artists/${p.slug}` : `/salons/${p.slug}`;
}

/** Portfolio-first card for artists and salons: the work leads, the name follows. */
export function ProviderCard({ provider: p, className, priority }: { provider: ProviderCardDTO; className?: string; priority?: boolean }) {
  const href = providerHref(p);
  const distance = formatDistance(p.distanceKm);
  return (
    <article className={cn("group relative", className)}>
      <Link href={href} className="block rounded-2xl focus-visible:outline-offset-4" aria-label={`${p.name}, ${p.city}`}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-sunken">
          {p.cover ? (
            <Image
              src={p.cover.url}
              alt={p.cover.alt ?? `Work by ${p.name}`}
              fill
              priority={priority}
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 80vw"
              className="object-cover transition duration-700 ease-(--ease-soft) group-hover:scale-[1.04]"
            />
          ) : (
            <ImagePlaceholder label={p.name} />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
          <div className="absolute top-3 left-3 flex gap-1.5">
            {p.isDemo && <DemoBadge />}
            {p.type === "SALON" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-primary backdrop-blur">
                <Store className="size-3" aria-hidden="true" /> Salon
              </span>
            )}
          </div>
          {/* avatar overlaps the image edge */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <span className="relative grid size-11 place-items-center overflow-hidden rounded-full border-2 border-white bg-primary-soft text-sm font-semibold text-primary shadow-card">
              {p.avatar ? <Image src={p.avatar.url} alt="" fill sizes="44px" className="object-cover" /> : initials(p.name)}
            </span>
          </div>
        </div>
        <div className="mt-3 px-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-sans text-[15px] font-semibold text-ink">{p.name}</h3>
            {p.verified && <VerifiedBadge />}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[13px] text-muted">
            <Rating value={p.rating} count={p.reviewCount} />
            <span aria-hidden="true">·</span>
            <span className="inline-flex min-w-0 items-center gap-0.5 truncate">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{distance ? `${distance} · ` : ""}{p.area ?? p.city}</span>
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <PriceDisplay paise={p.startingPrice} />
            <span className="flex items-center gap-2 text-xs text-muted">
              {p.experienceYears ? <span>{p.experienceYears} yrs exp</span> : null}
              {p.serviceMode !== "STUDIO" && p.serviceMode && (
                <span className="inline-flex items-center gap-0.5" title="Home service available">
                  <Home className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Home service available</span>
                </span>
              )}
            </span>
          </div>
        </div>
      </Link>
      <SaveButton type={p.type} id={p.id} label={p.name} className="absolute top-3 right-3" />
    </article>
  );
}

export function ProviderCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-[4/5] rounded-2xl" />
      <div className="skeleton mt-3 h-4 w-2/3 rounded" />
      <div className="skeleton mt-2 h-3 w-1/2 rounded" />
    </div>
  );
}

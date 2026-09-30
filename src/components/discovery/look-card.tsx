import Image from "next/image";
import Link from "next/link";
import type { LookDTO } from "@/types/dto";
import { formatPaise, initials } from "@/lib/utils";
import { VerifiedBadge } from "@/components/ui/display";
import { SaveButton } from "./save-button";

export function lookHref(look: LookDTO) {
  const base = look.provider.type === "ARTIST" ? `/artists/${look.provider.slug}` : `/salons/${look.provider.slug}`;
  return `${base}?look=${look.id}#portfolio`;
}

/** Pinterest-style tile. Clicking opens the look on its artist's profile, ready to book. */
export function LookCard({ look, sizes = "(min-width: 1024px) 24vw, (min-width: 640px) 32vw, 48vw", showProvider = true }: { look: LookDTO; sizes?: string; showProvider?: boolean }) {
  const ratio = look.image.width && look.image.height ? look.image.width / look.image.height : 4 / 5;
  return (
    <article className="group relative mb-4 break-inside-avoid">
      <Link href={lookHref(look)} className="block rounded-2xl" aria-label={`${look.title} by ${look.provider.name}`}>
        <div className="relative overflow-hidden rounded-2xl bg-surface-sunken" style={{ aspectRatio: ratio }}>
          <Image
            src={look.image.url}
            alt={look.image.alt ?? look.title}
            fill
            sizes={sizes}
            className="object-cover transition duration-700 ease-(--ease-soft) group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0 opacity-80 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100" />
          <div className="absolute inset-x-0 bottom-0 p-3 text-white md:translate-y-2 md:opacity-0 md:transition md:duration-300 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100">
            <p className="text-sm leading-tight font-semibold">{look.title}</p>
            {look.priceFrom ? <p className="mt-0.5 text-xs text-white/85">{formatPaise(look.priceFrom)} onwards</p> : null}
          </div>
        </div>
      </Link>
      {showProvider && (
        <Link href={lookHref(look)} className="mt-2 flex items-center gap-2 px-0.5" tabIndex={-1}>
          <span className="relative grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
            {look.provider.avatar ? <Image src={look.provider.avatar.url} alt="" fill sizes="24px" className="object-cover" /> : initials(look.provider.name)}
          </span>
          <span className="truncate text-xs font-medium text-ink">{look.provider.name}</span>
          {look.provider.verified && <VerifiedBadge className="-ml-1" />}
        </Link>
      )}
      <SaveButton type="LOOK" id={look.id} label={look.title} className="absolute top-2.5 right-2.5 size-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100" />
    </article>
  );
}

export function MasonryGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`columns-2 gap-4 sm:columns-3 lg:columns-4 ${className}`}>{children}</div>;
}

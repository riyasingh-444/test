"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { api } from "@/lib/api-client";
import { formatPaise } from "@/lib/utils";
import type { LookDTO } from "@/types/dto";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/discovery/save-button";
import { EmptyState } from "@/components/feedback/states";

/**
 * Masonry portfolio with a lightbox. `?look=<id>` deep-links a look (from Explore Looks),
 * and every look can be booked directly.
 */
export function PortfolioGallery({
  providerId,
  initial,
  initialCursor,
  bookHref,
  deepLinkedLook,
}: {
  providerId: string;
  initial: LookDTO[];
  initialCursor: string | null;
  bookHref: string;
  deepLinkedLook: LookDTO | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [items, setItems] = useState(() =>
    deepLinkedLook && !initial.some((l) => l.id === deepLinkedLook.id) ? [deepLinkedLook, ...initial] : initial,
  );
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const openId = params.get("look");
  const openIndex = items.findIndex((l) => l.id === openId);
  const open = openIndex >= 0 ? items[openIndex]! : null;

  const setOpen = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (id) next.set("look", id);
      else next.delete("look");
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [params, pathname, router],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && openIndex < items.length - 1) setOpen(items[openIndex + 1]!.id);
      if (e.key === "ArrowLeft" && openIndex > 0) setOpen(items[openIndex - 1]!.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openIndex, items, setOpen]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoading(true);
    try {
      const res = await api.get<LookDTO[]>("/looks", { providerId, cursor, limit: 24 });
      setItems((prev) => [...prev, ...res.data.filter((l) => !prev.some((p) => p.id === l.id))]);
      setCursor((res.meta?.nextCursor as string | null) ?? null);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return <EmptyState title="Portfolio coming soon" description="This professional hasn't added their work yet." />;
  }

  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 sm:gap-4">
        {items.map((l) => {
          const ratio = l.image.width && l.image.height ? l.image.width / l.image.height : 4 / 5;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => setOpen(l.id)}
              className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-surface-sunken text-left sm:mb-4"
              style={{ aspectRatio: ratio }}
              aria-label={`View ${l.title}`}
            >
              <Image src={l.image.url} alt={l.image.alt ?? l.title} fill sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 48vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                {l.title}
                {l.priceFrom ? <span className="block text-xs font-normal text-white/85">{formatPaise(l.priceFrom)} onwards</span> : null}
              </span>
            </button>
          );
        })}
      </div>
      {cursor && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={loadMore} loading={loading}>
            Show more work
          </Button>
        </div>
      )}

      <D.Root open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-50 bg-[#1a0610]/85 backdrop-blur-sm data-[state=open]:animate-fade-in" />
          <D.Content className="fixed inset-0 z-50 flex items-center justify-center p-3 focus:outline-none sm:p-8" aria-describedby={undefined}>
            {open && (
              <div className="grid max-h-full w-full max-w-5xl overflow-hidden rounded-3xl bg-surface shadow-float md:grid-cols-[1.4fr_1fr]">
                <div className="relative min-h-[50dvh] bg-ink md:min-h-[70dvh]">
                  <Image src={open.image.url} alt={open.image.alt ?? open.title} fill sizes="(min-width: 768px) 60vw, 100vw" className="object-contain" priority />
                  {openIndex > 0 && (
                    <button type="button" onClick={() => setOpen(items[openIndex - 1]!.id)} className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-primary" aria-label="Previous look">
                      <ChevronLeft className="size-5" />
                    </button>
                  )}
                  {openIndex < items.length - 1 && (
                    <button type="button" onClick={() => setOpen(items[openIndex + 1]!.id)} className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-primary" aria-label="Next look">
                      <ChevronRight className="size-5" />
                    </button>
                  )}
                </div>
                <div className="flex flex-col p-6 md:p-8">
                  {open.category && <p className="eyebrow">{open.category.name}</p>}
                  <D.Title className="mt-2 font-serif text-3xl leading-tight text-primary">{open.title}</D.Title>
                  {open.priceFrom ? <p className="mt-2 text-lg font-semibold text-ink">{formatPaise(open.priceFrom)} <span className="text-sm font-normal text-muted">onwards</span></p> : null}
                  {open.description && <p className="mt-4 text-sm leading-relaxed text-muted">{open.description}</p>}
                  {open.styleTags.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {open.styleTags.map((t) => (
                        <li key={t} className="rounded-full bg-primary-soft px-3 py-1 text-xs text-primary capitalize">
                          {t.replace("-", " ")}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto flex items-center gap-3 pt-8">
                    <Button asChild className="flex-1">
                      <Link href={open.serviceId ? `${bookHref}?service=${open.serviceId}` : bookHref}>
                        <CalendarCheck aria-hidden="true" /> Book this look
                      </Link>
                    </Button>
                    <SaveButton type="LOOK" id={open.id} label={open.title} variant="plain" className="size-11 border border-line" />
                  </div>
                  <D.Close className="mt-3 text-sm text-muted hover:text-primary">Close</D.Close>
                </div>
              </div>
            )}
            {!open && loading && <Loader2 className="size-6 animate-spin text-white" />}
          </D.Content>
        </D.Portal>
      </D.Root>
    </>
  );
}

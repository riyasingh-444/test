"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { LOOK_STYLES } from "@/lib/catalog";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { LookDTO } from "@/types/dto";
import { LookCard, MasonryGrid } from "./look-card";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";

/**
 * Explore Looks — style chips + masonry feed with cursor pagination.
 * `infinite` loads more automatically as the sentinel scrolls into view.
 */
export function LooksExplorer({
  initial,
  initialCursor,
  infinite = false,
  city,
  pageSize = 12,
}: {
  initial: LookDTO[];
  initialCursor: string | null;
  infinite?: boolean;
  city?: string;
  pageSize?: number;
}) {
  const [style, setStyle] = useState<string | null>(null);
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  const fetchPage = useCallback(
    async (opts: { style: string | null; cursor?: string | null; replace: boolean }) => {
      const id = ++reqId.current;
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<LookDTO[]>("/looks", { style: opts.style, cursor: opts.cursor, limit: pageSize, city });
        if (id !== reqId.current) return;
        setItems((prev) => (opts.replace ? res.data : [...prev, ...res.data]));
        setCursor((res.meta?.nextCursor as string | null) ?? null);
      } catch (e) {
        if (id === reqId.current) setError(e instanceof ApiError ? e.message : "Couldn't load looks");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [city, pageSize],
  );

  const selectStyle = (s: string | null) => {
    setStyle(s);
    void fetchPage({ style: s, replace: true });
  };

  useEffect(() => {
    if (!infinite || !sentinel.current || !cursor) return;
    const el = sentinel.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading && cursor) void fetchPage({ style, cursor, replace: false });
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [infinite, cursor, loading, style, fetchPage]);

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
      active ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary/40 hover:text-primary",
    );

  return (
    <div>
      <div className="scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="toolbar" aria-label="Filter looks by style">
        <button type="button" className={chip(style === null)} aria-pressed={style === null} onClick={() => selectStyle(null)}>
          All looks
        </button>
        {LOOK_STYLES.map((s) => (
          <button key={s.key} type="button" className={chip(style === s.key)} aria-pressed={style === s.key} onClick={() => selectStyle(s.key)}>
            {s.name}
          </button>
        ))}
      </div>

      {error && items.length === 0 ? (
        <ErrorState description={error} retry={<Button variant="secondary" size="sm" onClick={() => selectStyle(style)}>Try again</Button>} />
      ) : items.length === 0 && !loading ? (
        <EmptyState title="No looks yet" description="Artists are adding new work every day. Try another style." />
      ) : (
        <div className={cn("transition-opacity duration-300", loading && items.length > 0 && !cursor && "opacity-60")} aria-busy={loading}>
          <MasonryGrid>
            {items.map((l) => (
              <LookCard key={l.id} look={l} />
            ))}
          </MasonryGrid>
        </div>
      )}

      {infinite ? (
        <div ref={sentinel} className="flex h-16 items-center justify-center" aria-live="polite">
          {loading && <Loader2 className="size-5 animate-spin text-primary" aria-label="Loading more looks" />}
          {!cursor && items.length > 0 && <p className="text-sm text-muted">You&apos;ve seen every look ✨</p>}
        </div>
      ) : null}
      {error && items.length > 0 && <p className="mt-4 text-center text-sm text-danger">{error}</p>}
    </div>
  );
}

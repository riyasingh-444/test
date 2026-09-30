"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { CITIES, LAUNCH_CATEGORIES } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { useUserLocation } from "@/components/providers/app-providers";

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "nearest", label: "Nearest" },
  { value: "rating", label: "Highest rated" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "popular", label: "Most booked" },
];

const PRICE_BANDS = [
  { label: "Any price", min: "", max: "" },
  { label: "Under ₹2,000", min: "", max: "2000" },
  { label: "₹2,000 – ₹5,000", min: "2000", max: "5000" },
  { label: "₹5,000 – ₹15,000", min: "5000", max: "15000" },
  { label: "₹15,000+", min: "15000", max: "" },
];

/** All filters live in the URL, so results are shareable, SSR-rendered and back-button friendly. */
function useFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  return { params, set, pending };
}

export function SortSelect() {
  const { params, set } = useFilterParams();
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="hidden sm:inline">Sort by</span>
      <NativeSelect
        value={params.get("sort") ?? "recommended"}
        onChange={(e) => set({ sort: e.target.value })}
        className="h-10 w-auto min-w-44 rounded-full"
        aria-label="Sort results"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-line py-5 first:pt-0 last:border-0">
      <legend className="mb-3 text-sm font-semibold text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition",
        active ? "border-primary bg-primary-soft font-medium text-primary" : "border-line bg-surface text-ink hover:border-primary/30",
      )}
    >
      {children}
    </button>
  );
}

function FilterBody({ type }: { type: "artists" | "salons" }) {
  const { params, set } = useFilterParams();
  const { location, locateMe, locating } = useUserLocation();
  const toggle = (key: string, value: string) => set({ [key]: params.get(key) === value ? null : value });
  const nearMe = params.has("lat");
  const band = PRICE_BANDS.findIndex((b) => b.min === (params.get("minPrice") ?? "") && b.max === (params.get("maxPrice") ?? ""));

  return (
    <div>
      <FilterGroup title="Location">
        <NativeSelect
          value={nearMe ? "__near" : (params.get("city") ?? "")}
          onChange={async (e) => {
            const v = e.target.value;
            if (v === "__near") {
              if (location?.lat != null) set({ lat: String(location.lat), lng: String(location.lng), city: null, sort: "nearest" });
              else await locateMe();
            } else set({ city: v, lat: null, lng: null, radiusKm: null });
          }}
          aria-label="City"
        >
          <option value="">All cities</option>
          <option value="__near">{locating ? "Locating…" : "Near me"}</option>
          {CITIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        {nearMe && (
          <div className="mt-3 flex flex-wrap gap-2">
            {["5", "10", "25", "50"].map((km) => (
              <Chip key={km} active={(params.get("radiusKm") ?? "25") === km} onClick={() => set({ radiusKm: km })}>
                {km} km
              </Chip>
            ))}
          </div>
        )}
      </FilterGroup>

      <FilterGroup title="Service">
        <NativeSelect value={params.get("category") ?? ""} onChange={(e) => set({ category: e.target.value, group: null })} aria-label="Service category">
          <option value="">All services</option>
          {LAUNCH_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={params.get("mode") === "HOME"} onClick={() => toggle("mode", "HOME")}>
            Home service
          </Chip>
          <Chip active={params.get("mode") === "STUDIO"} onClick={() => toggle("mode", "STUDIO")}>
            {type === "salons" ? "In-salon" : "Studio"}
          </Chip>
        </div>
      </FilterGroup>

      <FilterGroup title="Price">
        <div className="flex flex-wrap gap-2">
          {PRICE_BANDS.map((b, i) => (
            <Chip key={b.label} active={band === i || (band === -1 && i === 0)} onClick={() => set({ minPrice: b.min, maxPrice: b.max })}>
              {b.label}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Rating">
        <div className="flex flex-wrap gap-2">
          {["4", "4.5"].map((r) => (
            <Chip key={r} active={params.get("minRating") === r} onClick={() => toggle("minRating", r)}>
              {r}★ & above
            </Chip>
          ))}
        </div>
      </FilterGroup>

      {type === "artists" && (
        <FilterGroup title="Experience">
          <div className="flex flex-wrap gap-2">
            {["2", "5", "10"].map((y) => (
              <Chip key={y} active={params.get("minExperience") === y} onClick={() => toggle("minExperience", y)}>
                {y}+ years
              </Chip>
            ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Availability">
        <div className="flex flex-wrap gap-2">
          <Chip active={params.get("available") === "today"} onClick={() => set({ available: params.get("available") === "today" ? null : "today", date: null })}>
            Available today
          </Chip>
          <Chip active={params.get("available") === "week"} onClick={() => set({ available: params.get("available") === "week" ? null : "week", date: null })}>
            This week
          </Chip>
        </div>
      </FilterGroup>

      <FilterGroup title="Trust">
        <Chip active={params.get("verified") === "true"} onClick={() => toggle("verified", "true")}>
          Verified only
        </Chip>
      </FilterGroup>
    </div>
  );
}

const FILTER_KEYS = ["city", "lat", "category", "group", "mode", "minPrice", "maxPrice", "minRating", "minExperience", "available", "date", "verified"];

export function ExploreFilters({ type }: { type: "artists" | "salons" }) {
  const { params, set, pending } = useFilterParams();
  const [open, setOpen] = useState(false);
  const activeCount = FILTER_KEYS.filter((k) => params.has(k)).length;
  const clearAll = () => set(Object.fromEntries([...FILTER_KEYS, "lng", "radiusKm", "q"].map((k) => [k, null])));

  return (
    <>
      {/* Desktop sidebar */}
      <aside aria-label="Filters" className={cn("hidden lg:block", pending && "opacity-70")}>
        <div className="sticky top-24 rounded-2xl bg-surface p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-sans text-base font-semibold text-ink">Filters</h2>
            {activeCount > 0 && (
              <button type="button" onClick={clearAll} className="text-sm text-primary hover:underline">
                Clear all
              </button>
            )}
          </div>
          <FilterBody type={type} />
        </div>
      </aside>

      {/* Mobile sheet */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm" className="lg:hidden">
            <SlidersHorizontal aria-hidden="true" />
            Filters{activeCount > 0 && <span className="ml-0.5 grid size-5 place-items-center rounded-full bg-primary text-[11px] text-white">{activeCount}</span>}
          </Button>
        </DialogTrigger>
        <SheetContent title="Filters">
          <FilterBody type={type} />
          <div className="sticky bottom-0 -mx-5 mt-2 flex gap-3 border-t border-line bg-surface px-5 pt-4">
            <Button variant="ghost" className="flex-1" onClick={clearAll}>
              <X aria-hidden="true" /> Clear
            </Button>
            <Button className="flex-1" onClick={() => setOpen(false)}>
              Show results
            </Button>
          </div>
        </SheetContent>
      </Dialog>
    </>
  );
}

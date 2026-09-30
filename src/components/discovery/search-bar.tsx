"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Search, Sparkles } from "lucide-react";
import { CITIES, LAUNCH_CATEGORIES } from "@/lib/catalog";
import { todayKey } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUserLocation } from "@/components/providers/app-providers";

/**
 * Service · Location · Date search. Suggestions come from the category catalogue;
 * free text also matches artist/salon names and neighbourhoods on the results page.
 */
export function SearchBar({ className, defaultQuery = "", variant = "hero" }: { className?: string; defaultQuery?: string; variant?: "hero" | "inline" }) {
  const router = useRouter();
  const { location } = useUserLocation();
  const ids = { q: useId(), city: useId(), date: useId(), list: useId() };
  const [q, setQ] = useState(defaultQuery);
  const [city, setCity] = useState(() => CITIES.find((c) => c.name === location?.city)?.slug ?? "");
  const [date, setDate] = useState("");
  const [focused, setFocused] = useState(false);
  const today = useMemo(() => todayKey(), []);

  const suggestions = useMemo(() => {
    const term = q.trim().toLowerCase();
    return LAUNCH_CATEGORIES.filter((c) => !term || c.name.toLowerCase().includes(term)).slice(0, 6);
  }, [q]);

  const submit = (e?: React.FormEvent, override?: { category?: string }) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (override?.category) params.set("category", override.category);
    else if (q.trim()) {
      const exact = LAUNCH_CATEGORIES.find((c) => c.name.toLowerCase() === q.trim().toLowerCase());
      if (exact) params.set("category", exact.slug);
      else params.set("q", q.trim());
    }
    if (city) params.set("city", city);
    if (date) params.set("date", date);
    router.push(`/explore?${params.toString()}`);
  };

  const field = "flex min-w-0 flex-1 items-center gap-3 px-5";
  const label = "block text-[11px] font-semibold tracking-wider text-primary uppercase";
  const input = "w-full min-w-0 bg-transparent text-[15px] text-ink placeholder:text-subtle focus:outline-none";

  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn(
        "relative flex flex-col rounded-3xl bg-surface p-2 shadow-float md:flex-row md:items-center md:rounded-full",
        variant === "inline" && "shadow-card",
        className,
      )}
    >
      <div className={cn(field, "relative py-3 md:py-2")}>
        <Sparkles className="size-5 shrink-0 text-rose-deep" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <label htmlFor={ids.q} className={label}>
            Service
          </label>
          <input
            id={ids.q}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Bridal makeup, nails, mehendi…"
            className={input}
            autoComplete="off"
            role="combobox"
            aria-expanded={focused && suggestions.length > 0}
            aria-controls={ids.list}
            aria-autocomplete="list"
          />
        </div>
        {focused && suggestions.length > 0 && (
          <ul
            id={ids.list}
            role="listbox"
            className="absolute top-full left-2 z-20 mt-2 w-[min(22rem,calc(100vw-3rem))] rounded-2xl border border-line bg-surface p-2 shadow-lift"
          >
            {suggestions.map((s) => (
              <li key={s.slug} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQ(s.name);
                    setFocused(false);
                    submit(undefined, { category: s.slug });
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-ink hover:bg-primary-soft hover:text-primary"
                >
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mx-5 h-px bg-line md:mx-0 md:h-9 md:w-px" aria-hidden="true" />

      <div className={cn(field, "py-3 md:max-w-52 md:py-2")}>
        <MapPin className="size-5 shrink-0 text-rose-deep" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <label htmlFor={ids.city} className={label}>
            Location
          </label>
          <select id={ids.city} value={city} onChange={(e) => setCity(e.target.value)} className={cn(input, "appearance-none")}>
            <option value="">{location?.label ?? "Anywhere in India"}</option>
            {CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mx-5 h-px bg-line md:mx-0 md:h-9 md:w-px" aria-hidden="true" />

      <div className={cn(field, "py-3 md:max-w-48 md:py-2")}>
        <CalendarDays className="size-5 shrink-0 text-rose-deep" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <label htmlFor={ids.date} className={label}>
            Date
          </label>
          <input id={ids.date} type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </div>
      </div>

      <Button type="submit" size="lg" className="m-1 mt-2 md:mt-1 md:ml-2">
        <Search aria-hidden="true" />
        <span>Search</span>
      </Button>
    </form>
  );
}

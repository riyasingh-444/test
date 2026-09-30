"use client";

import { useState } from "react";
import { Check, ChevronDown, LocateFixed, MapPin } from "lucide-react";
import { CITIES } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserLocation } from "@/components/providers/app-providers";

export function LocationSelector({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { location, setCity, locateMe, locating } = useUserLocation();
  const [open, setOpen] = useState(false);
  const label = location?.label ?? location?.city ?? "Select city";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex max-w-44 items-center gap-1.5 rounded-full text-sm font-medium text-ink transition hover:text-primary",
            compact ? "px-2 py-1" : "border border-line bg-surface px-3.5 py-2 hover:border-primary/30",
            className,
          )}
          aria-label={`Location: ${label}. Change location`}
        >
          <MapPin className="size-4 shrink-0 text-rose-deep" aria-hidden="true" />
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent title="Where are you looking?" description="We'll show beauty professionals near you.">
        <Button
          variant="soft"
          className="w-full justify-start"
          loading={locating}
          onClick={async () => {
            await locateMe();
            setOpen(false);
          }}
        >
          {!locating && <LocateFixed aria-hidden="true" />}
          Use my current location
        </Button>
        <p className="eyebrow mt-6 mb-3">Popular cities</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CITIES.map((c) => {
            const active = location?.city === c.name && !location?.label;
            return (
              <li key={c.slug}>
                <button
                  type="button"
                  onClick={() => {
                    setCity(c.name);
                    setOpen(false);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition",
                    active ? "border-primary bg-primary-soft text-primary" : "border-line hover:border-primary/30 hover:bg-blush",
                  )}
                >
                  {c.name}
                  {active && <Check className="size-4" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

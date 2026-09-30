"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { addDaysToKey, todayKey } from "@/lib/time";
import { cn, formatPaise } from "@/lib/utils";
import type { ServiceDTO, SlotDTO } from "@/types/dto";
import { NativeSelect } from "@/components/ui/input";

const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" });
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const toDate = (k: string) => new Date(`${k}T00:00:00Z`);

/** Live slot preview: pick a service and a day, see real open times, jump into booking. */
export function AvailabilityPreview({ services, bookHref }: { services: ServiceDTO[]; bookHref: string }) {
  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => addDaysToKey(todayKey(), i)), []);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(days[0]!);
  const key = `${serviceId}|${date}`;
  const [result, setResult] = useState<{ key: string; slots?: SlotDTO[]; error?: string } | null>(null);
  const slots = result?.key === key ? (result.slots ?? null) : null;
  const error = result?.key === key ? (result.error ?? null) : null;

  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    api
      .get<{ slots: SlotDTO[] }>("/availability/slots", { serviceId, date })
      .then((r) => !cancelled && setResult({ key, slots: r.data.slots }))
      .catch((e) => !cancelled && setResult({ key, error: e instanceof ApiError ? e.message : "Couldn't load availability" }));
    return () => {
      cancelled = true;
    };
  }, [serviceId, date, key]);

  if (services.length === 0) return <p className="text-sm text-muted">No bookable services yet.</p>;
  const open = slots?.filter((s) => s.available) ?? [];
  const selected = services.find((s) => s.id === serviceId);

  return (
    <div>
      <NativeSelect value={serviceId} onChange={(e) => setServiceId(e.target.value)} aria-label="Service">
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} · {formatPaise(s.price)}
          </option>
        ))}
      </NativeSelect>
      <div className="scrollbar-none -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Date">
        {days.map((d, i) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={d === date}
            onClick={() => setDate(d)}
            className={cn(
              "flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2.5 transition",
              d === date ? "border-primary bg-primary text-white" : "border-line bg-surface hover:border-primary/30",
            )}
          >
            <span className={cn("text-[11px] uppercase", d === date ? "text-white/80" : "text-muted")}>{i === 0 ? "Today" : dayFmt.format(toDate(d))}</span>
            <span className="text-sm font-semibold">{dateFmt.format(toDate(d))}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 min-h-24" aria-live="polite">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : slots === null ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton h-10 rounded-xl" />
            ))}
          </div>
        ) : open.length === 0 ? (
          <p className="rounded-xl bg-surface-sunken px-4 py-6 text-center text-sm text-muted">No open slots on this day. Try another date.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {open.slice(0, 12).map((s) => (
              <li key={s.time}>
                <Link
                  href={`${bookHref}?service=${serviceId}&date=${date}&time=${s.time}`}
                  className="block rounded-xl border border-line bg-surface py-2 text-center text-sm font-medium text-ink transition hover:border-primary hover:bg-primary-soft hover:text-primary"
                >
                  {s.time}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selected && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Clock className="size-3.5" aria-hidden="true" /> {selected.durationMin} min · times shown in IST
        </p>
      )}
    </div>
  );
}

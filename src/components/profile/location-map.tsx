import { MapPin, Navigation } from "lucide-react";

/**
 * Google Maps embed when NEXT_PUBLIC_GOOGLE_MAPS_KEY is configured; otherwise an address
 * card with a directions link (works without any API key).
 */
export function LocationMap({ lat, lng, name, address }: { lat: number; lng: number; name: string; address?: string | null }) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const directions = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      {key ? (
        <iframe
          title={`Map showing ${name}`}
          src={`https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${lat},${lng}&zoom=15`}
          className="h-64 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="grid h-40 place-items-center bg-[radial-gradient(circle_at_50%_60%,var(--color-rose-soft),var(--color-primary-soft)_70%)]">
          <MapPin className="size-8 text-primary" aria-hidden="true" />
        </div>
      )}
      <div className="flex items-center justify-between gap-4 p-4">
        <p className="text-sm text-ink/85">{address ?? name}</p>
        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm font-medium text-primary hover:bg-primary-soft"
        >
          <Navigation className="size-4" aria-hidden="true" /> Directions
        </a>
      </div>
    </div>
  );
}

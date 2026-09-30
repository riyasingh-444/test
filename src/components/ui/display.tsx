import { BadgeCheck, Star } from "lucide-react";
import { cn, formatPaise } from "@/lib/utils";

export function Rating({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!count && !value) {
    return <span className={cn("text-xs font-medium text-muted", className)}>New on Rivya</span>;
  }
  return (
    <span
      className={cn("inline-flex items-center gap-1 font-medium text-ink", size === "sm" ? "text-[13px]" : "text-sm", className)}
      aria-label={`Rated ${value.toFixed(1)} out of 5${count != null ? ` from ${count} reviews` : ""}`}
    >
      <Star className={cn("fill-gold text-gold", size === "sm" ? "size-3.5" : "size-4")} aria-hidden="true" />
      {value.toFixed(1)}
      {count != null && <span className="font-normal text-muted">({count.toLocaleString("en-IN")})</span>}
    </span>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} aria-label={`${value} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden="true" className={cn("size-3.5", i <= Math.round(value) ? "fill-gold text-gold" : "fill-line text-line")} />
      ))}
    </span>
  );
}

export function VerifiedBadge({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-primary", className)} title="Verified by Rivya">
      <BadgeCheck className="size-4 fill-primary text-white" aria-hidden="true" />
      {withLabel ? "Verified" : <span className="sr-only">Verified</span>}
    </span>
  );
}

export function PriceDisplay({
  paise,
  prefix = "from",
  className,
}: {
  paise: number;
  prefix?: "from" | "onwards" | null;
  className?: string;
}) {
  if (!paise) return null;
  return (
    <span className={cn("text-sm text-ink", className)}>
      {prefix === "from" && <span className="text-muted">From </span>}
      <span className="font-semibold">{formatPaise(paise)}</span>
      {prefix === "onwards" && <span className="text-muted"> onwards</span>}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn("rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase backdrop-blur", className)}
      title="Demo profile — sample data for development"
    >
      Demo
    </span>
  );
}

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Rivya brand mark: a crescent moon cradling a small sparkle.
 * Placeholder identity built in code — swap for the final asset by replacing
 * <MoonMark /> internals; all usages go through <Logo />.
 */
export function MoonMark({ className, tone = "brand" }: { className?: string; tone?: "brand" | "light" }) {
  const maskId = useId();
  const moon = tone === "light" ? "#ffffff" : "var(--color-primary)";
  return (
    <svg viewBox="0 0 48 48" className={cn("size-8", className)} aria-hidden="true" focusable="false">
      <defs>
        <mask id={maskId}>
          <rect width="48" height="48" fill="white" />
          <circle cx="31" cy="18.5" r="16.5" fill="black" />
        </mask>
      </defs>
      <circle cx="23" cy="25" r="19" fill={moon} mask={`url(#${maskId})`} />
      {/* four-point sparkle */}
      <path
        d="M34 26.5c.5 3.2 1.8 4.5 5 5-3.2.5-4.5 1.8-5 5-.5-3.2-1.8-4.5-5-5 3.2-.5 4.5-1.8 5-5Z"
        fill="var(--color-gold)"
      />
      <circle cx="40.5" cy="21" r="1.2" fill="var(--color-rose)" />
    </svg>
  );
}

export function Logo({
  className,
  tone = "brand",
  showWordmark = true,
}: {
  className?: string;
  tone?: "brand" | "light";
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <MoonMark tone={tone} className="size-8 shrink-0" />
      {showWordmark && (
        <span
          aria-hidden="true"
          className={cn(
            "font-serif text-[1.65rem] leading-none font-semibold tracking-[0.14em]",
            tone === "light" ? "text-white" : "text-primary",
          )}
        >
          RIVYA
        </span>
      )}
      <span className="sr-only">Rivya</span>
    </span>
  );
}

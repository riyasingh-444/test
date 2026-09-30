import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Sparkles } from "lucide-react";
import { MoonMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center", className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-primary-soft">
        {Icon ? <Icon className="size-6 text-primary" aria-hidden="true" /> : <MoonMark className="size-8" />}
      </div>
      <h3 className="text-2xl">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>}
      {action && (
        <Button asChild variant="secondary" className="mt-6">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Please try again.",
  className,
  retry,
}: {
  title?: string;
  description?: string;
  className?: string;
  retry?: React.ReactNode;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center rounded-2xl bg-danger-soft/50 px-6 py-10 text-center", className)}>
      <AlertCircle className="mb-3 size-6 text-danger" aria-hidden="true" />
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {retry && <div className="mt-4">{retry}</div>}
    </div>
  );
}

/** Branded placeholder when a partner has no photo yet — never a mismatched stock image. */
export function ImagePlaceholder({ label, className }: { label?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_30%_20%,var(--color-rose-soft),var(--color-primary-soft)_60%)]",
        className,
      )}
    >
      <Sparkles className="size-5 text-primary/60" aria-hidden="true" />
      {label && <span className="px-4 text-center font-serif text-lg text-primary/80">{label}</span>}
    </div>
  );
}

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Server-rendered, crawlable pagination that preserves the current query string. */
export function Pagination({
  page,
  total,
  limit,
  basePath,
  searchParams,
}: {
  page: number;
  total: number;
  limit: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(searchParams).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
    if (p === 1) q.delete("page");
    else q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const window = [...new Set([1, page - 1, page, page + 1, pages].filter((p) => p >= 1 && p <= pages))].sort((a, b) => a - b);
  const item = "grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm transition";
  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(item, "hover:bg-primary-soft")} aria-label="Previous page" rel="prev">
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "opacity-30")} aria-hidden="true">
          <ChevronLeft className="size-4" />
        </span>
      )}
      {window.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && p - window[i - 1]! > 1 && <span className="px-1 text-muted">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(item, p === page ? "bg-primary font-semibold text-white" : "text-ink hover:bg-primary-soft")}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={href(page + 1)} className={cn(item, "hover:bg-primary-soft")} aria-label="Next page" rel="next">
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "opacity-30")} aria-hidden="true">
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

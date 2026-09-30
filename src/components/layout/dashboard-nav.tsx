"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

/** Vertical nav on desktop, horizontally scrolling pills on mobile. */
export function DashboardNav({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition lg:rounded-xl lg:py-2.5",
                  active ? "bg-primary text-white lg:bg-primary-soft lg:text-primary" : "bg-surface text-ink hover:text-primary lg:bg-transparent lg:hover:bg-surface",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

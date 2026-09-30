"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** `icon` is a rendered element (e.g. <CalendarDays />) so server layouts can pass it to this client component. */
export type NavItem = { href: string; label: string; icon: React.ReactNode; exact?: boolean };

/** Vertical nav on desktop, horizontally scrolling pills on mobile. */
export function DashboardNav({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
        {items.map(({ href, label, icon, exact }) => {
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
                <span className="[&_svg]:size-4" aria-hidden="true">{icon}</span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

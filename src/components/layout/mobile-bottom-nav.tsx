"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, Heart, Home, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/providers/app-providers";

/** App-style bottom navigation for phones (hidden from md up). */
export function MobileBottomNav() {
  const pathname = usePathname();
  const user = useSession();
  const items = [
    { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
    { href: "/explore", label: "Explore", icon: Compass, match: (p: string) => p.startsWith("/explore") || p.startsWith("/looks") },
    { href: "/account/bookings", label: "Bookings", icon: CalendarDays, match: (p: string) => p.startsWith("/account/bookings") },
    { href: "/account/wishlist", label: "Wishlist", icon: Heart, match: (p: string) => p.startsWith("/account/wishlist") },
    {
      href: user ? "/account" : "/login",
      label: user ? "Profile" : "Log in",
      icon: User,
      match: (p: string) => p === "/account" || p.startsWith("/account/profile") || p === "/login",
    },
  ];
  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted",
                )}
              >
                <Icon className={cn("size-[22px]", active && "fill-primary/10")} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

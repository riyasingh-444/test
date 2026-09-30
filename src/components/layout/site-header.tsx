"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DropdownMenu } from "radix-ui";
import { Bell, CalendarDays, Heart, LayoutDashboard, LogOut, Menu, Search, Shield, User } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent, DialogTrigger } from "@/components/ui/dialog";
import { LocationSelector } from "@/components/discovery/location-selector";
import { useSession } from "@/components/providers/app-providers";
import { api } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/explore?type=artists", label: "Artists" },
  { href: "/explore?type=salons", label: "Salons" },
  { href: "/categories", label: "Categories" },
  { href: "/offers", label: "Offers" },
];

export function SiteHeader() {
  const user = useSession();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300",
        scrolled ? "border-b border-line/70 bg-blush/85 shadow-xs backdrop-blur-xl" : "border-b border-transparent bg-blush",
      )}
    >
      <div className="container-page flex h-16 items-center gap-4 lg:h-[72px]">
        <Link href="/" className="shrink-0 rounded-lg" aria-label="Rivya home">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => {
            // Query-string links (Artists/Salons) share /explore, so only plain paths highlight.
            const active = !n.href.includes("?") && (pathname === n.href || pathname.startsWith(`${n.href}/`));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  active ? "text-primary" : "text-ink/80 hover:text-primary",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LocationSelector className="hidden md:inline-flex" />
          <LocationSelector compact className="md:hidden" />
          <Link
            href="/explore"
            className="grid size-10 place-items-center rounded-full text-primary transition hover:bg-primary-soft lg:hidden"
            aria-label="Search"
          >
            <Search className="size-5" aria-hidden="true" />
          </Link>
          <Link href="/become-a-partner" className="hidden px-3 text-sm font-medium text-primary hover:underline xl:inline">
            Become a Partner
          </Link>
          {user ? (
            <UserMenu />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

function UserMenu() {
  const user = useSession()!;
  const router = useRouter();
  const item =
    "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary [&_svg]:size-4";
  const signOut = async () => {
    await api.post("/auth/logout").catch(() => undefined);
    router.push("/");
    router.refresh();
  };
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="grid size-10 place-items-center rounded-full bg-primary text-sm font-semibold text-white ring-offset-2 transition hover:ring-2 hover:ring-rose/60"
        aria-label="Account menu"
      >
        {initials(user.name)}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-60 rounded-2xl border border-line bg-surface p-2 shadow-lift">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            {user.email && <p className="truncate text-xs text-muted">{user.email}</p>}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          {(user.role === "ARTIST" || user.role === "SALON") && (
            <DropdownMenu.Item className={item} onSelect={() => router.push("/partner")}>
              <LayoutDashboard aria-hidden="true" /> Partner dashboard
            </DropdownMenu.Item>
          )}
          {user.role === "ADMIN" && (
            <DropdownMenu.Item className={item} onSelect={() => router.push("/admin")}>
              <Shield aria-hidden="true" /> Admin
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item className={item} onSelect={() => router.push("/account")}>
            <User aria-hidden="true" /> My account
          </DropdownMenu.Item>
          <DropdownMenu.Item className={item} onSelect={() => router.push("/account/bookings")}>
            <CalendarDays aria-hidden="true" /> Bookings
          </DropdownMenu.Item>
          <DropdownMenu.Item className={item} onSelect={() => router.push("/account/wishlist")}>
            <Heart aria-hidden="true" /> Wishlist
          </DropdownMenu.Item>
          <DropdownMenu.Item className={item} onSelect={() => router.push("/account/notifications")}>
            <Bell aria-hidden="true" /> Notifications
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item className={item} onSelect={signOut}>
            <LogOut aria-hidden="true" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MobileMenu() {
  const user = useSession();
  const [open, setOpen] = useState(false);
  const link = "flex items-center rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-primary-soft hover:text-primary";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="grid size-10 place-items-center rounded-full text-primary hover:bg-primary-soft lg:hidden" aria-label="Open menu">
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <SheetContent title="Menu" side="right">
        {/* Close the sheet when a link inside it is followed. */}
        <nav aria-label="Mobile" className="flex flex-col gap-1" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={link}>
              {n.label}
            </Link>
          ))}
          <Link href="/looks" className={link}>
            Explore looks
          </Link>
          <hr className="my-3 border-line" />
          <Link href="/become-a-partner" className={cn(link, "text-primary")}>
            Become a Partner
          </Link>
          {!user && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button asChild variant="secondary">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </nav>
      </SheetContent>
    </Dialog>
  );
}

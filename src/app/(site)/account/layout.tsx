import { redirect } from "next/navigation";
import { Bell, CalendarDays, CreditCard, Heart, LayoutGrid, MapPin, Shield, Star, User } from "lucide-react";
import { getSessionUser } from "@/server/page-context";
import { DashboardNav, type NavItem } from "@/components/layout/dashboard-nav";

const NAV: NavItem[] = [
  { href: "/account", label: "Overview", icon: <LayoutGrid />, exact: true },
  { href: "/account/bookings", label: "Bookings", icon: <CalendarDays /> },
  { href: "/account/wishlist", label: "Wishlist", icon: <Heart /> },
  { href: "/account/reviews", label: "Reviews", icon: <Star /> },
  { href: "/account/notifications", label: "Notifications", icon: <Bell /> },
  { href: "/account/payments", label: "Payments", icon: <CreditCard /> },
  { href: "/account/profile", label: "Profile", icon: <User /> },
  { href: "/account/addresses", label: "Addresses", icon: <MapPin /> },
  { href: "/account/security", label: "Security", icon: <Shield /> },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");
  return (
    <div className="container-page pt-6 md:pt-10">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-4 hidden font-serif text-2xl text-primary lg:block">Hi, {user.name.split(" ")[0]}</p>
          <DashboardNav items={NAV} label="Account" />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

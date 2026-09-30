import { AppProviders } from "@/components/providers/app-providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { getSessionUser, getUserLocation } from "@/server/page-context";

/** Public site + customer area chrome. Partner and admin areas have their own layouts. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, location] = await Promise.all([getSessionUser(), getUserLocation()]);
  return (
    <AppProviders user={user} initialLocation={location}>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <SiteFooter />
      <MobileBottomNav />
    </AppProviders>
  );
}

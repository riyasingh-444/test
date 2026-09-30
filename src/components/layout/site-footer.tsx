import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { siteConfig } from "@/lib/site";
import { CITIES } from "@/lib/catalog";

const COLUMNS = [
  {
    title: "Rivya",
    links: [
      { href: "/about", label: "About" },
      { href: "/careers", label: "Careers" },
      { href: "/contact", label: "Contact" },
      { href: "/help", label: "Help Center" },
    ],
  },
  {
    title: "For Customers",
    links: [
      { href: "/explore", label: "Explore artists" },
      { href: "/looks", label: "Explore looks" },
      { href: "/offers", label: "Offers" },
      { href: "/account/bookings", label: "My bookings" },
    ],
  },
  {
    title: "For Partners",
    links: [
      { href: "/become-a-partner", label: "Become a Partner" },
      { href: "/register?type=artist", label: "For Artists" },
      { href: "/register?type=salon", label: "For Salons" },
      { href: "/partner", label: "Partner dashboard" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-primary text-white/85 md:mt-32">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
            Discover trusted beauty professionals, explore their work, and book your perfect look.
          </p>
          <ul className="mt-6 flex gap-4 text-sm" aria-label="Social links">
            {Object.entries(siteConfig.social).map(([name, href]) => (
              <li key={name}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="capitalize text-white/70 hover:text-white">
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="font-sans text-xs font-semibold tracking-[0.18em] text-rose uppercase">{col.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/75 transition hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-4 py-6 text-xs text-white/55 md:flex-row md:items-center md:justify-between">
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            {CITIES.map((c) => (
              <Link key={c.slug} href={`/explore?city=${c.slug}`} className="hover:text-white">
                {c.name}
              </Link>
            ))}
          </p>
          <p className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <span>© {new Date().getFullYear()} Rivya</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

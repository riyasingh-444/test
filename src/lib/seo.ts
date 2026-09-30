import { siteConfig } from "./site";

/** Serialise JSON-LD safely (escapes `<` so the script tag can't be broken out of). */
export function jsonLd(data: Record<string, unknown>) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export function absoluteUrl(path: string) {
  return new URL(path, siteConfig.url).toString();
}

export function providerJsonLd(p: {
  type: "ARTIST" | "SALON";
  name: string;
  url: string;
  image?: string | null;
  description?: string | null;
  city: string;
  area?: string | null;
  address?: string | null;
  rating: number;
  reviewCount: number;
  priceFrom?: number;
  geo?: { lat: number; lng: number };
}) {
  return {
    "@context": "https://schema.org",
    "@type": p.type === "SALON" ? "BeautySalon" : "HealthAndBeautyBusiness",
    name: p.name,
    url: absoluteUrl(p.url),
    image: p.image ?? undefined,
    description: p.description ?? undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: p.area ?? p.city,
      addressRegion: p.city,
      addressCountry: "IN",
      streetAddress: p.address ?? undefined,
    },
    ...(p.geo ? { geo: { "@type": "GeoCoordinates", latitude: p.geo.lat, longitude: p.geo.lng } } : {}),
    ...(p.priceFrom ? { priceRange: `From ₹${Math.round(p.priceFrom / 100)}` } : {}),
    ...(p.reviewCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviewCount, bestRating: 5 } }
      : {}),
  };
}

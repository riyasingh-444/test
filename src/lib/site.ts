/** Public, non-secret site configuration (safe for client bundles). */
export const siteConfig = {
  name: "Rivya",
  tagline: "Find Your Perfect Beauty Artist",
  description:
    "Discover trusted beauty professionals, explore their work, and book your perfect look. Bridal makeup, hair, nails, mehendi, skincare and salons across India.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000",
  social: {
    instagram: "https://instagram.com/",
    pinterest: "https://pinterest.com/",
    youtube: "https://youtube.com/",
    linkedin: "https://linkedin.com/",
  },
} as const;

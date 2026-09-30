/**
 * Launch catalogue. Categories live in MongoDB (see models/category) — this list is the
 * seed/bootstrap source and the fallback for static UI (e.g. footer links).
 * Adding a category = inserting a document; no code changes needed.
 */
export const CATEGORY_GROUPS = [
  { key: "bridal", name: "Bridal", blurb: "Your day, your look" },
  { key: "makeup", name: "Makeup", blurb: "Party, engagement & more" },
  { key: "hair", name: "Hair", blurb: "Cuts, colour & styling" },
  { key: "nails", name: "Nails", blurb: "Art, manicure & pedicure" },
  { key: "mehendi", name: "Mehendi", blurb: "Bridal & festive designs" },
  { key: "skincare", name: "Skincare", blurb: "Facials & treatments" },
  { key: "spa", name: "Spa", blurb: "Relax & restore" },
  { key: "brows-lashes", name: "Brows & Lashes", blurb: "Shape, tint & extensions" },
  { key: "styling", name: "Styling", blurb: "Saree draping & more" },
] as const;
export type CategoryGroupKey = (typeof CATEGORY_GROUPS)[number]["key"];

export const LAUNCH_CATEGORIES: { slug: string; name: string; group: CategoryGroupKey }[] = [
  { slug: "bridal-makeup", name: "Bridal Makeup", group: "bridal" },
  { slug: "pre-bridal", name: "Pre-Bridal", group: "bridal" },
  { slug: "party-makeup", name: "Party Makeup", group: "makeup" },
  { slug: "engagement-makeup", name: "Engagement Makeup", group: "makeup" },
  { slug: "reception-makeup", name: "Reception Makeup", group: "makeup" },
  { slug: "hair-styling", name: "Hair Styling", group: "hair" },
  { slug: "haircut", name: "Haircut", group: "hair" },
  { slug: "hair-coloring", name: "Hair Coloring", group: "hair" },
  { slug: "nail-art", name: "Nail Art", group: "nails" },
  { slug: "manicure", name: "Manicure", group: "nails" },
  { slug: "pedicure", name: "Pedicure", group: "nails" },
  { slug: "mehendi", name: "Mehendi", group: "mehendi" },
  { slug: "facial", name: "Facial", group: "skincare" },
  { slug: "skincare", name: "Skincare", group: "skincare" },
  { slug: "spa", name: "Spa", group: "spa" },
  { slug: "eyebrows", name: "Eyebrows", group: "brows-lashes" },
  { slug: "lashes", name: "Lashes", group: "brows-lashes" },
  { slug: "saree-draping", name: "Saree Draping", group: "styling" },
  { slug: "beauty-packages", name: "Beauty Packages", group: "bridal" },
];

/** Look styles used for portfolio tagging and the Explore Looks filters. */
export const LOOK_STYLES = [
  { key: "bridal", name: "Bridal Looks" },
  { key: "natural", name: "Natural Makeup" },
  { key: "glam", name: "Glam Makeup" },
  { key: "party", name: "Party Makeup" },
  { key: "minimal", name: "Minimal Makeup" },
  { key: "traditional", name: "Traditional" },
  { key: "hairstyle", name: "Hair Styles" },
  { key: "nail-art", name: "Nail Art" },
] as const;

/** Launch cities with centre coordinates [lng, lat]. */
export const CITIES = [
  { slug: "delhi", name: "Delhi", center: [77.209, 28.6139] },
  { slug: "mumbai", name: "Mumbai", center: [72.8777, 19.076] },
  { slug: "bengaluru", name: "Bengaluru", center: [77.5946, 12.9716] },
  { slug: "hyderabad", name: "Hyderabad", center: [78.4867, 17.385] },
  { slug: "pune", name: "Pune", center: [73.8567, 18.5204] },
  { slug: "chennai", name: "Chennai", center: [80.2707, 13.0827] },
  { slug: "kolkata", name: "Kolkata", center: [88.3639, 22.5726] },
  { slug: "jaipur", name: "Jaipur", center: [75.7873, 26.9124] },
  { slug: "chandigarh", name: "Chandigarh", center: [76.7794, 30.7333] },
  { slug: "lucknow", name: "Lucknow", center: [80.9462, 26.8467] },
] as const satisfies readonly { slug: string; name: string; center: readonly [number, number] }[];

export type CitySlug = (typeof CITIES)[number]["slug"];

export function findCity(slugOrName?: string | null) {
  if (!slugOrName) return undefined;
  const v = slugOrName.toLowerCase();
  return CITIES.find((c) => c.slug === v || c.name.toLowerCase() === v);
}

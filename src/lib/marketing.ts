/**
 * Brand/marketing imagery (hero, CTAs). Placeholder photography from Unsplash (free licence)
 * until Rivya's own campaign shoot is available — swap URLs here only.
 */
const u = (id: string, w: number, h: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

export const MARKETING = {
  heroMain: { url: u("1610173826608-bd1f53a52db1", 1100, 1400), alt: "Bride in a red lehenga with bridal makeup" },
  heroTop: { url: u("1597983073493-88cd35cf93b0", 700, 800), alt: "Traditional festive makeup look" },
  heroBottom: { url: u("1604654894610-df63bc536371", 700, 700), alt: "Chocolate chrome nail art" },
  partner: { url: u("1487412947147-5cebf100ffc2", 1200, 1400), alt: "Makeup artist applying lipstick" },
} as const;

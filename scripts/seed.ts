/**
 * Rivya DEMO seed.
 *
 *   npm run seed            # insert demo data (idempotent: skips if demo data exists)
 *   npm run seed -- --reset # delete ALL demo records (isDemo / @rivya.demo) and re-seed
 *
 * Every record created here is flagged `isDemo: true` (users use the @rivya.demo domain),
 * and the UI marks demo profiles. Imagery is from Unsplash (free licence) and is for
 * development only — real partner media is uploaded to Cloudinary.
 *
 * Reviews are created through the same invariant as production: each one belongs to a
 * COMPLETED demo booking, so every review is a verified booking.
 */
import mongoose, { Types } from "mongoose";
import { hash } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import { CATEGORY_GROUPS, CITIES, LAUNCH_CATEGORIES } from "../src/lib/catalog";
import { addDaysToKey, todayKey, zonedInstant } from "../src/lib/time";
import {
  Artist,
  Availability,
  Booking,
  Category,
  Offer,
  PortfolioItem,
  Review,
  Salon,
  Service,
  User,
} from "../src/server/models";

const DEMO_DOMAIN = "rivya.demo";

/* ── Imagery (verified Unsplash photo ids) ───────────────────────────── */
const PHOTOS = {
  glam: "1487412947147-5cebf100ffc2",
  productsFlat: "1522335789203-aabd1fc54bc9",
  palette: "1512496015851-a90fb38ba796",
  brushes: "1516975080664-ed2fc6a32937",
  salonChairs: "1560066984-138dadb4c035",
  salonPink: "1521590832167-7bcbfaa6381f",
  nailsDark: "1604654894610-df63bc536371",
  nailsNude: "1610992015732-2449b76344bc",
  curlyPortrait: "1519699047748-de8e457a634e",
  hairWash: "1595476108010-b4d1f102b1b1",
  facial: "1570172619644-dfd03ed5d881",
  massage: "1544161515-4ab6ce6db874",
  spaProducts: "1540555700478-4be289fbecef",
  indianBride: "1610173826608-bd1f53a52db1",
  nailPainting: "1457972729786-0411a3b2b626",
  powderBrush: "1503236823255-94609f598e71",
  pinkProducts: "1596462502278-27bfdc403348",
  serum: "1515377905703-c4788e51af15",
  portraitNoseRing: "1531746020798-e6953c6e8e04",
  portraitSmile: "1494790108377-be9c29b29330",
  bobCut: "1438761681033-6461ffad8d80",
  portraitStripes: "1544005313-94ddf0286df2",
  portraitStudio: "1534528741775-53994a69daeb",
  portraitGlam: "1524504388940-b1c1722653e1",
  hairWaves: "1522337360788-8b13dee7a37e",
  blowDry: "1562322140-8baeececf3df",
  salonDark: "1600948836101-f9ffda59d250",
  anarkali: "1583391733956-3750e0ff4e8b",
  saree: "1610030469983-98e550d6193c",
  hairSalonBusy: "1622288432450-277d0fef5ed6",
  salonWhite: "1595944024804-733665a112db",
  curls: "1629397685944-7073f5589754",
  traditional: "1597983073493-88cd35cf93b0",
  salonModern: "1633681926022-84c23e8cb2d6",
} as const;
type PhotoKey = keyof typeof PHOTOS;

const img = (key: PhotoKey, w = 1200, h = 1500, alt?: string) => ({
  url: `https://images.unsplash.com/photo-${PHOTOS[key]}?auto=format&fit=crop&w=${w}&h=${h}&q=80`,
  width: w,
  height: h,
  alt,
});

/** Looks per category slug. Categories without verified imagery get no demo looks. */
const LOOK_POOLS: Record<string, { photo: PhotoKey; title: string; styles: string[] }[]> = {
  "bridal-makeup": [
    { photo: "indianBride", title: "HD Bridal Makeup", styles: ["bridal", "traditional"] },
    { photo: "traditional", title: "Classic Red Bridal", styles: ["bridal", "traditional"] },
    { photo: "anarkali", title: "Soft Glam Bride", styles: ["bridal", "natural"] },
    { photo: "glam", title: "Airbrush Bridal Base", styles: ["bridal", "glam"] },
  ],
  "engagement-makeup": [
    { photo: "anarkali", title: "Pastel Engagement Look", styles: ["natural", "traditional"] },
    { photo: "traditional", title: "Ring Ceremony Glow", styles: ["traditional", "glam"] },
  ],
  "reception-makeup": [
    { photo: "glam", title: "Reception Glam", styles: ["glam", "party"] },
    { photo: "portraitGlam", title: "Smokey Reception Eyes", styles: ["glam"] },
  ],
  "party-makeup": [
    { photo: "portraitSmile", title: "Red Lip Party Look", styles: ["party", "glam"] },
    { photo: "glam", title: "Winged Liner Glam", styles: ["party", "glam"] },
    { photo: "portraitNoseRing", title: "Dewy Minimal Party", styles: ["minimal", "natural"] },
  ],
  "hair-styling": [
    { photo: "hairWaves", title: "Soft Beach Waves", styles: ["hairstyle"] },
    { photo: "curls", title: "Red-Carpet Curls", styles: ["hairstyle", "glam"] },
    { photo: "blowDry", title: "Volume Blowout", styles: ["hairstyle"] },
  ],
  haircut: [
    { photo: "bobCut", title: "Textured Bob", styles: ["hairstyle", "minimal"] },
    { photo: "hairSalonBusy", title: "Layered Cut", styles: ["hairstyle"] },
  ],
  "hair-coloring": [
    { photo: "hairWaves", title: "Honey Balayage", styles: ["hairstyle"] },
    { photo: "portraitStudio", title: "Caramel Highlights", styles: ["hairstyle", "natural"] },
  ],
  "nail-art": [
    { photo: "nailsDark", title: "Chocolate Chrome Nails", styles: ["nail-art"] },
    { photo: "nailPainting", title: "Berry Gel Art", styles: ["nail-art"] },
  ],
  manicure: [
    { photo: "nailsNude", title: "Nude Almond Manicure", styles: ["nail-art", "minimal"] },
    { photo: "nailPainting", title: "Classic Gel Manicure", styles: ["nail-art"] },
  ],
  facial: [{ photo: "facial", title: "Brightening Facial", styles: ["natural"] }],
  skincare: [
    { photo: "serum", title: "Glass-Skin Prep", styles: ["natural", "minimal"] },
    { photo: "facial", title: "Hydra Glow Treatment", styles: ["natural"] },
  ],
  spa: [
    { photo: "massage", title: "Aromatherapy Massage", styles: [] },
    { photo: "spaProducts", title: "Relaxing Spa Ritual", styles: [] },
  ],
  "saree-draping": [
    { photo: "saree", title: "Silk Saree Drape", styles: ["traditional"] },
    { photo: "anarkali", title: "Contemporary Drape", styles: ["traditional", "minimal"] },
  ],
};

const CATEGORY_IMAGES: Partial<Record<string, PhotoKey>> = {
  "bridal-makeup": "indianBride",
  "pre-bridal": "facial",
  "party-makeup": "portraitSmile",
  "engagement-makeup": "anarkali",
  "reception-makeup": "glam",
  "hair-styling": "hairWaves",
  haircut: "bobCut",
  "hair-coloring": "portraitStudio",
  "nail-art": "nailsDark",
  manicure: "nailsNude",
  pedicure: "nailPainting",
  facial: "facial",
  skincare: "serum",
  spa: "massage",
  "saree-draping": "saree",
  "beauty-packages": "palette",
};

/** Default service per category: [name, price ₹, duration min]. */
const SERVICE_TEMPLATES: Record<string, [string, number, number][]> = {
  "bridal-makeup": [["HD Bridal Makeup", 18000, 180], ["Airbrush Bridal Makeup", 25000, 210]],
  "pre-bridal": [["Pre-Bridal Glow Package", 12000, 240]],
  "party-makeup": [["Party Makeup", 3500, 75], ["Party Makeup + Hairdo", 5500, 105]],
  "engagement-makeup": [["Engagement Makeup", 9000, 120]],
  "reception-makeup": [["Reception Glam Makeup", 12000, 150]],
  "hair-styling": [["Occasion Hairstyle", 2500, 60], ["Blow-dry & Styling", 1500, 45]],
  haircut: [["Haircut & Finish", 1200, 45]],
  "hair-coloring": [["Global Hair Colour", 4500, 120], ["Balayage", 7500, 180]],
  "nail-art": [["Gel Nail Art (10 nails)", 1800, 75]],
  manicure: [["Classic Manicure", 800, 45]],
  pedicure: [["Spa Pedicure", 1200, 60]],
  facial: [["Hydra Facial", 3500, 75]],
  skincare: [["Skin Consultation & Treatment", 2500, 60]],
  spa: [["Full Body Massage (60 min)", 3000, 60]],
  "saree-draping": [["Saree Draping", 1200, 30]],
  "beauty-packages": [["Complete Glam Package", 8000, 180]],
};

const AREAS: Record<string, string[]> = {
  delhi: ["Hauz Khas", "Greater Kailash", "Rajouri Garden", "Vasant Kunj"],
  mumbai: ["Bandra West", "Juhu", "Andheri West", "Powai"],
  bengaluru: ["Indiranagar", "Koramangala", "Jayanagar"],
  hyderabad: ["Banjara Hills", "Jubilee Hills", "Gachibowli"],
  pune: ["Koregaon Park", "Baner", "Kalyani Nagar"],
  chennai: ["T. Nagar", "Adyar"],
  kolkata: ["Salt Lake", "Park Street"],
  jaipur: ["C-Scheme", "Malviya Nagar"],
  chandigarh: ["Sector 17", "Sector 35"],
  lucknow: ["Gomti Nagar", "Hazratganj"],
};

type ArtistSeed = {
  name: string;
  city: string;
  cats: string[];
  exp: number;
  avatar: PhotoKey;
  cover: PhotoKey;
  headline: string;
  mode: "HOME" | "STUDIO" | "BOTH";
  styles: string[];
};

const ARTISTS: ArtistSeed[] = [
  { name: "Aanya Kapoor", city: "delhi", cats: ["bridal-makeup", "engagement-makeup", "party-makeup"], exp: 9, avatar: "portraitNoseRing", cover: "indianBride", headline: "HD & airbrush bridal specialist", mode: "BOTH", styles: ["bridal", "glam", "traditional"] },
  { name: "Rhea Malhotra", city: "delhi", cats: ["hair-styling", "haircut", "hair-coloring"], exp: 7, avatar: "portraitStudio", cover: "hairWaves", headline: "Editorial hair & colour", mode: "STUDIO", styles: ["hairstyle"] },
  { name: "Simran Kaur", city: "delhi", cats: ["nail-art", "manicure", "pedicure"], exp: 5, avatar: "portraitSmile", cover: "nailsDark", headline: "Minimal & chrome nail art", mode: "BOTH", styles: ["nail-art", "minimal"] },
  { name: "Priya Arora", city: "delhi", cats: ["facial", "skincare", "pre-bridal"], exp: 11, avatar: "portraitStripes", cover: "facial", headline: "Clinical skincare & pre-bridal glow", mode: "STUDIO", styles: ["natural"] },
  { name: "Tara Mehta", city: "mumbai", cats: ["bridal-makeup", "reception-makeup"], exp: 12, avatar: "portraitGlam", cover: "traditional", headline: "Luxury bridal artistry", mode: "BOTH", styles: ["bridal", "glam"] },
  { name: "Zoya Shaikh", city: "mumbai", cats: ["party-makeup", "engagement-makeup"], exp: 6, avatar: "portraitNoseRing", cover: "glam", headline: "Soft glam for every celebration", mode: "HOME", styles: ["party", "glam"] },
  { name: "Isha Desai", city: "mumbai", cats: ["hair-coloring", "hair-styling"], exp: 8, avatar: "portraitStudio", cover: "curls", headline: "Balayage & lived-in colour", mode: "STUDIO", styles: ["hairstyle"] },
  { name: "Kavya Rao", city: "bengaluru", cats: ["skincare", "facial"], exp: 6, avatar: "portraitStripes", cover: "serum", headline: "Glass-skin facials", mode: "STUDIO", styles: ["natural", "minimal"] },
  { name: "Nandini Iyer", city: "bengaluru", cats: ["bridal-makeup", "saree-draping"], exp: 10, avatar: "portraitSmile", cover: "saree", headline: "South Indian bridal & draping", mode: "BOTH", styles: ["bridal", "traditional"] },
  { name: "Sana Fatima", city: "hyderabad", cats: ["bridal-makeup", "party-makeup"], exp: 8, avatar: "portraitGlam", cover: "anarkali", headline: "Nikah & reception looks", mode: "BOTH", styles: ["bridal", "glam"] },
  { name: "Mitali Joshi", city: "pune", cats: ["nail-art", "manicure"], exp: 4, avatar: "curlyPortrait", cover: "nailsNude", headline: "Clean-girl nails", mode: "HOME", styles: ["nail-art", "minimal"] },
  { name: "Lakshmi Narayanan", city: "chennai", cats: ["bridal-makeup", "saree-draping"], exp: 14, avatar: "portraitStudio", cover: "traditional", headline: "Temple-jewellery bridal looks", mode: "BOTH", styles: ["bridal", "traditional"] },
  { name: "Riddhi Rathore", city: "jaipur", cats: ["bridal-makeup", "engagement-makeup"], exp: 9, avatar: "portraitNoseRing", cover: "indianBride", headline: "Royal Rajasthani bridal", mode: "BOTH", styles: ["bridal", "traditional"] },
  { name: "Ananya Sen", city: "kolkata", cats: ["party-makeup", "reception-makeup"], exp: 7, avatar: "portraitSmile", cover: "portraitGlam", headline: "Bold eyes, bolder lips", mode: "BOTH", styles: ["party", "glam"] },
  { name: "Harleen Gill", city: "chandigarh", cats: ["party-makeup", "hair-styling"], exp: 6, avatar: "portraitGlam", cover: "hairWaves", headline: "Punjabi wedding glam & hair", mode: "HOME", styles: ["party", "hairstyle"] },
  { name: "Ayesha Rizvi", city: "lucknow", cats: ["engagement-makeup", "bridal-makeup"], exp: 8, avatar: "portraitStripes", cover: "anarkali", headline: "Nawabi elegance for your day", mode: "BOTH", styles: ["bridal", "traditional"] },
];

const SALONS = [
  { name: "Maison Lune Salon & Spa", city: "delhi", cats: ["haircut", "hair-coloring", "facial", "spa", "manicure"], cover: "salonPink" as PhotoKey, gallery: ["salonChairs", "hairWash", "massage"] as PhotoKey[], home: false },
  { name: "The Blush Studio", city: "mumbai", cats: ["party-makeup", "hair-styling", "nail-art", "manicure"], cover: "salonWhite" as PhotoKey, gallery: ["nailsNude", "blowDry", "palette"] as PhotoKey[], home: true },
  { name: "Velvet Room Salon", city: "bengaluru", cats: ["haircut", "hair-coloring", "hair-styling"], cover: "salonDark" as PhotoKey, gallery: ["hairSalonBusy", "curls", "hairWash"] as PhotoKey[], home: false },
  { name: "Aura Beauty Lounge", city: "hyderabad", cats: ["facial", "skincare", "pre-bridal", "manicure", "pedicure"], cover: "salonModern" as PhotoKey, gallery: ["facial", "serum", "nailPainting"] as PhotoKey[], home: false },
  { name: "Petal & Polish", city: "pune", cats: ["nail-art", "manicure", "pedicure"], cover: "salonChairs" as PhotoKey, gallery: ["nailsDark", "nailsNude", "nailPainting"] as PhotoKey[], home: true },
  { name: "Gulaab Spa & Salon", city: "jaipur", cats: ["spa", "facial", "haircut", "bridal-makeup"], cover: "spaProducts" as PhotoKey, gallery: ["massage", "salonPink", "indianBride"] as PhotoKey[], home: false },
];

const REVIEW_COMMENTS = [
  "Absolutely loved my look — it stayed flawless all night.",
  "So professional and warm. She understood exactly what I wanted.",
  "Punctual, hygienic and incredibly talented. Highly recommend!",
  "My skin looked like skin, not cakey at all. Will book again.",
  "The photos came out stunning. Everyone asked who did my makeup.",
  "Great experience, very calm even with a tight timeline.",
  "Beautiful work and fair pricing. Booking was super easy.",
  "Loved the attention to detail. Worth every rupee.",
];
const CUSTOMER_NAMES = ["Neha Verma", "Pooja Iyer", "Ritika Sharma", "Megha Nair", "Aditi Kulkarni", "Shreya Ghosh", "Divya Menon", "Ishita Bansal"];

/* ── Deterministic PRNG so re-seeding gives stable data ───────────────── */
let state = 20260930;
const rand = () => ((state = (state * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const jitter = ([lng, lat]: readonly [number, number], km = 6): [number, number] => [
  +(lng + ((rand() - 0.5) * 2 * km) / 101).toFixed(5),
  +(lat + ((rand() - 0.5) * 2 * km) / 111).toFixed(5),
];
const bookingCode = () => `RV-${randomBytes(4).toString("hex").slice(0, 6).toUpperCase()}`;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (add it to .env.local)");
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--allow-production")) {
    throw new Error("Refusing to seed demo data with NODE_ENV=production (pass --allow-production to override)");
  }
  const reset = process.argv.includes("--reset");
  await mongoose.connect(uri);
  console.log("Connected. Syncing indexes…");
  // Sequential: parallel index builds can overwhelm small clusters (e.g. Atlas M0).
  for (const m of Object.values(mongoose.models)) await m.syncIndexes();

  if (reset) {
    const demoUsers = await User.find({ email: new RegExp(`@${DEMO_DOMAIN.replace(".", "\\.")}$`) }).select("_id").lean();
    const ids = demoUsers.map((u) => u._id);
    const providers = [
      ...(await Artist.find({ isDemo: true }).select("_id").lean()),
      ...(await Salon.find({ isDemo: true }).select("_id").lean()),
    ].map((p) => p._id);
    await Promise.all([
      Booking.deleteMany({ $or: [{ isDemo: true }, { customerId: { $in: ids } }] }),
      Review.deleteMany({ isDemo: true }),
      PortfolioItem.deleteMany({ isDemo: true }),
      Service.deleteMany({ isDemo: true }),
      Availability.deleteMany({ providerId: { $in: providers } }),
      Offer.deleteMany({ isDemo: true }),
      Artist.deleteMany({ isDemo: true }),
      Salon.deleteMany({ isDemo: true }),
      User.deleteMany({ _id: { $in: ids } }),
    ]);
    console.log("Removed previous demo data.");
  } else if (await Artist.exists({ isDemo: true })) {
    console.log("Demo data already present. Use `npm run seed -- --reset` to recreate it.");
    await mongoose.disconnect();
    return;
  }

  /* Categories (real catalogue, not demo) */
  const groupOrder = CATEGORY_GROUPS.map((g) => g.key);
  for (const [i, c] of LAUNCH_CATEGORIES.entries()) {
    const photo = CATEGORY_IMAGES[c.slug];
    await Category.updateOne(
      { slug: c.slug },
      {
        $set: { name: c.name, group: c.group, sortOrder: groupOrder.indexOf(c.group) * 100 + i, isActive: true, ...(photo ? { image: img(photo, 800, 1000, c.name) } : {}) },
      },
      { upsert: true },
    );
  }
  const cats = new Map((await Category.find().lean()).map((c) => [c.slug, c]));
  console.log(`Categories: ${cats.size}`);

  /* Accounts */
  const password = process.env.SEED_DEMO_PASSWORD || `Demo-${randomBytes(6).toString("base64url")}1`;
  const passwordHash = await hash(password, { memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  const mkUser = (name: string, local: string, role: "CUSTOMER" | "ARTIST" | "SALON" | "ADMIN", city?: string) =>
    User.create({ name, email: `${local}@${DEMO_DOMAIN}`, role, passwordHash, defaultCity: city, emailVerifiedAt: new Date(), isDemo: true });

  await mkUser("Rivya Admin (Demo)", "admin", "ADMIN");
  const demoCustomer = await mkUser("Demo Customer", "customer", "CUSTOMER", "Delhi");
  const customers = [demoCustomer, ...(await Promise.all(CUSTOMER_NAMES.map((n) => mkUser(n, slug(n), "CUSTOMER"))))];

  const weekly = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, isOpen: day !== 1, open: day === 0 ? "11:00" : "10:00", close: "20:00" }));
  const today = todayKey();

  type Provider = { type: "ARTIST" | "SALON"; id: Types.ObjectId; name: string; slug: string; services: { _id: Types.ObjectId; name: string; price: number; durationMin: number; bufferMin: number }[] };
  const providers: Provider[] = [];

  /* Artists */
  for (const a of ARTISTS) {
    const city = CITIES.find((c) => c.slug === a.city)!;
    const user = await mkUser(a.name, slug(a.name), "ARTIST", city.name);
    const artistSlug = `${slug(a.name)}-${a.city}`;
    const artist = await Artist.create({
      userId: user._id,
      slug: artistSlug,
      displayName: a.name,
      headline: a.headline,
      bio: `${a.name.split(" ")[0]} is a ${city.name}-based beauty professional with ${a.exp} years of experience. ${a.headline}. Products used include premium international brands, and every kit is sanitised between clients. (Demo profile)`,
      experienceYears: a.exp,
      languages: ["English", "Hindi"],
      categoryIds: a.cats.map((s) => cats.get(s)!._id),
      styles: a.styles,
      location: { city: city.name, area: pick(AREAS[a.city]!), point: { type: "Point", coordinates: jitter(city.center) } },
      serviceMode: a.mode,
      serviceRadiusKm: 20,
      avatar: img(a.avatar, 400, 400, a.name),
      cover: img(a.cover, 1600, 1000, `${a.name} portfolio`),
      socialLinks: { instagram: "https://instagram.com/" },
      policies: {
        cancellation: "Free cancellation up to 24 hours before the appointment. Later cancellations may be charged 50%.",
        advancePercent: 30,
        travelNote: a.mode !== "STUDIO" ? "Travel within 20 km included; beyond that, charges apply." : undefined,
      },
      verificationStatus: rand() > 0.2 ? "VERIFIED" : "UNDER_REVIEW",
      isDemo: true,
    });

    const services = [];
    let order = 0;
    for (const catSlug of a.cats) {
      for (const [name, rupees, dur] of SERVICE_TEMPLATES[catSlug] ?? []) {
        const price = Math.round((rupees * (0.85 + rand() * 0.4)) / 100) * 100 * 100;
        services.push(
          await Service.create({
            providerType: "ARTIST",
            providerId: artist._id,
            categoryId: cats.get(catSlug)!._id,
            name,
            description: `${name} by ${a.name.split(" ")[0]}. Includes consultation and finishing touches.`,
            includes: catSlug.includes("makeup") ? ["Skin prep", "Lashes", "Draping assistance"] : [],
            price,
            priceType: catSlug === "bridal-makeup" ? "STARTING_AT" : "FIXED",
            durationMin: dur,
            bufferMin: a.mode === "STUDIO" ? 15 : 45,
            serviceMode: a.mode,
            homeServiceFee: a.mode === "STUDIO" ? 0 : 50_000,
            sortOrder: order++,
            isDemo: true,
          }),
        );
      }
    }
    await Artist.updateOne({ _id: artist._id }, { startingPrice: Math.min(...services.map((s) => s.price)) });
    await Availability.create({ providerType: "ARTIST", providerId: artist._id, weeklyHours: weekly, minNoticeMin: 180 });

    // Portfolio looks
    const looks = a.cats.flatMap((c) => (LOOK_POOLS[c] ?? []).map((l) => ({ ...l, catSlug: c })));
    for (const [i, l] of looks.entries()) {
      const h = [1200, 1500, 1000, 1350][i % 4]!;
      const svc = services.find((s) => String(s.categoryId) === String(cats.get(l.catSlug)!._id));
      await PortfolioItem.create({
        providerType: "ARTIST",
        providerId: artist._id,
        image: img(l.photo, 1000, h, l.title),
        title: l.title,
        categoryId: cats.get(l.catSlug)!._id,
        styleTags: l.styles,
        serviceId: svc?._id,
        priceFrom: svc?.price,
        city: city.name,
        isFeatured: i === 0,
        isDemo: true,
      });
    }
    providers.push({ type: "ARTIST", id: artist._id, name: a.name, slug: artistSlug, services });
  }
  console.log(`Artists: ${ARTISTS.length}`);

  /* Salons */
  for (const s of SALONS) {
    const city = CITIES.find((c) => c.slug === s.city)!;
    const owner = await mkUser(`${s.name} (Owner)`, slug(s.name), "SALON", city.name);
    const salonSlug = `${slug(s.name)}-${s.city}`;
    const staff = await Artist.find({ isDemo: true, "location.city": city.name }).limit(2).select("_id").lean();
    const salon = await Salon.create({
      ownerId: owner._id,
      slug: salonSlug,
      name: s.name,
      headline: "Hair · Skin · Nails · Spa",
      description: `${s.name} is a calm, design-led salon in ${city.name} offering expert hair, skin and nail services with hospital-grade hygiene. (Demo profile)`,
      contactPhone: "+910000000000",
      location: { city: city.name, area: pick(AREAS[s.city]!), addressLine: "Demo address — not a real location", point: { type: "Point", coordinates: jitter(city.center, 4) } },
      categoryIds: s.cats.map((c) => cats.get(c)!._id),
      cover: img(s.cover, 1600, 1000, s.name),
      images: s.gallery.map((g) => img(g, 1200, 900)),
      openingHours: weekly,
      amenities: ["Air conditioned", "Card & UPI accepted", "Sanitised tools", "Complimentary beverages"],
      staffArtistIds: staff.map((x) => x._id),
      offersHomeService: s.home,
      verificationStatus: "VERIFIED",
      isDemo: true,
    });
    const services = [];
    let order = 0;
    for (const catSlug of s.cats) {
      for (const [name, rupees, dur] of (SERVICE_TEMPLATES[catSlug] ?? []).slice(0, 2)) {
        services.push(
          await Service.create({
            providerType: "SALON",
            providerId: salon._id,
            categoryId: cats.get(catSlug)!._id,
            name,
            price: Math.round(rupees * 0.9) * 100,
            durationMin: dur,
            bufferMin: 15,
            serviceMode: s.home ? "BOTH" : "STUDIO",
            homeServiceFee: s.home ? 30_000 : 0,
            sortOrder: order++,
            isDemo: true,
          }),
        );
      }
    }
    await Salon.updateOne({ _id: salon._id }, { startingPrice: Math.min(...services.map((x) => x.price)) });
    await Availability.create({ providerType: "SALON", providerId: salon._id, weeklyHours: weekly.map((w) => ({ ...w, isOpen: true })), minNoticeMin: 120, capacity: 3 });
    for (const [i, g] of s.gallery.entries()) {
      const catSlug = s.cats[i % s.cats.length]!;
      await PortfolioItem.create({
        providerType: "SALON",
        providerId: salon._id,
        image: img(g, 1000, [1200, 1000, 1400][i % 3]!, s.name),
        title: `${cats.get(catSlug)!.name} at ${s.name}`,
        categoryId: cats.get(catSlug)!._id,
        city: city.name,
        isDemo: true,
      });
    }
    providers.push({ type: "SALON", id: salon._id, name: s.name, slug: salonSlug, services });
  }
  console.log(`Salons: ${SALONS.length}`);

  /* Completed bookings + verified reviews */
  let reviews = 0;
  for (const p of providers) {
    const count = 3 + Math.floor(rand() * 6);
    for (let i = 0; i < count; i++) {
      const customer = customers[1 + ((i + reviews) % (customers.length - 1))]!;
      const svc = pick(p.services);
      const dateKey = addDaysToKey(today, -(5 + Math.floor(rand() * 120)));
      const startAt = zonedInstant(dateKey, pick(["10:00", "12:00", "15:00", "17:00"]));
      const endAt = new Date(startAt.getTime() + svc.durationMin * 60_000);
      const booking = await Booking.create({
        code: bookingCode(),
        customerId: customer._id,
        providerType: p.type,
        providerId: p.id,
        serviceId: svc._id,
        serviceSnapshot: { name: svc.name, durationMin: svc.durationMin, bufferMin: svc.bufferMin, price: svc.price },
        providerSnapshot: { name: p.name, slug: p.slug },
        dateKey,
        startAt,
        endAt,
        blockedUntil: new Date(endAt.getTime() + svc.bufferMin * 60_000),
        mode: "STUDIO",
        pricing: { subtotal: svc.price, total: svc.price, commission: Math.floor(svc.price / 10) },
        paymentMethod: "PAY_AT_VENUE",
        status: "COMPLETED",
        paymentStatus: "PAID",
        holdExpiresAt: null,
        statusHistory: [{ status: "PENDING" }, { status: "CONFIRMED" }, { status: "COMPLETED" }],
        isDemo: true,
      });
      const rating = rand() > 0.85 ? 4 : 5;
      const review = await Review.create({
        bookingId: booking._id,
        customerId: customer._id,
        providerType: p.type,
        providerId: p.id,
        serviceId: svc._id,
        serviceName: svc.name,
        customerName: customer.name,
        rating,
        comment: pick(REVIEW_COMMENTS),
        verified: true,
        isDemo: true,
        createdAt: new Date(endAt.getTime() + 86_400_000),
      });
      await Booking.updateOne({ _id: booking._id }, { reviewId: review._id });
      reviews++;
    }
    const [agg] = await Review.aggregate<{ avg: number; n: number }>([
      { $match: { providerId: p.id, status: "PUBLISHED" } },
      { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } },
    ]);
    const model = (p.type === "ARTIST" ? Artist : Salon) as typeof Artist;
    await model.updateOne({ _id: p.id }, { ratingAvg: Math.round(agg!.avg * 100) / 100, reviewCount: agg!.n, bookingCount: agg!.n });
  }
  console.log(`Completed bookings with verified reviews: ${reviews}`);

  /* Upcoming bookings for the demo customer */
  const aanya = providers[0]!;
  const upcoming = aanya.services.find((s) => s.name.startsWith("Party")) ?? aanya.services[0]!;
  const upDate = addDaysToKey(today, 6);
  const upStart = zonedInstant(upDate, "16:00");
  const upEnd = new Date(upStart.getTime() + upcoming.durationMin * 60_000);
  await Booking.create({
    code: bookingCode(),
    customerId: demoCustomer._id,
    providerType: "ARTIST",
    providerId: aanya.id,
    serviceId: upcoming._id,
    serviceSnapshot: { name: upcoming.name, durationMin: upcoming.durationMin, bufferMin: upcoming.bufferMin, price: upcoming.price },
    providerSnapshot: { name: aanya.name, slug: aanya.slug },
    dateKey: upDate,
    startAt: upStart,
    endAt: upEnd,
    blockedUntil: new Date(upEnd.getTime() + upcoming.bufferMin * 60_000),
    mode: "STUDIO",
    pricing: { subtotal: upcoming.price, total: upcoming.price, commission: Math.floor(upcoming.price / 10) },
    paymentMethod: "PAY_AT_VENUE",
    status: "CONFIRMED",
    paymentStatus: "PENDING",
    holdExpiresAt: null,
    statusHistory: [{ status: "PENDING" }, { status: "CONFIRMED" }],
    isDemo: true,
  });

  /* Offers (demo) */
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86_400_000);
  await Offer.create([
    { title: "Demo · 15% off your first booking", subtitle: "Welcome to Rivya — up to ₹750 off", code: "WELCOME15", discountType: "PERCENT", discountValue: 15, maxDiscount: 75_000, minOrderValue: 150_000, startsAt: now, endsAt: in30, image: img("glam", 1200, 800), isDemo: true },
    { title: "Demo · Bridal season savings", subtitle: "Flat ₹2,000 off bridal makeup above ₹15,000", code: "BRIDE2000", discountType: "FLAT", discountValue: 200_000, minOrderValue: 1_500_000, categoryIds: [cats.get("bridal-makeup")!._id], startsAt: now, endsAt: in30, image: img("indianBride", 1200, 800), isDemo: true },
    { title: "Demo · Nail art Wednesdays", subtitle: "20% off nail art, up to ₹400", code: "NAILED20", discountType: "PERCENT", discountValue: 20, maxDiscount: 40_000, categoryIds: [cats.get("nail-art")!._id], startsAt: now, endsAt: in30, image: img("nailsDark", 1200, 800), isDemo: true },
  ]);

  console.log("\n✔ Demo data ready.");
  console.log(`  Accounts use the @${DEMO_DOMAIN} domain, e.g. customer@${DEMO_DOMAIN}, admin@${DEMO_DOMAIN}, aanya-kapoor@${DEMO_DOMAIN}`);
  console.log(
    process.env.SEED_DEMO_PASSWORD
      ? "  Password: the value of SEED_DEMO_PASSWORD"
      : `  Generated demo password (shown once): ${password}\n  Set SEED_DEMO_PASSWORD in .env.local to choose your own.`,
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});

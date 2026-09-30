import "server-only";
import type { Types } from "mongoose";
import type { ProviderType, ServiceMode } from "@/lib/constants";
import type {
  BookingDTO,
  ImageDTO,
  LookDTO,
  ProviderCardDTO,
  ReviewDTO,
  ServiceDTO,
} from "@/types/dto";

type Img = { url?: string | null; width?: number | null; height?: number | null; alt?: string | null } | null | undefined;

export function toImage(img: Img): ImageDTO | null {
  if (!img?.url) return null;
  return { url: img.url, width: img.width ?? null, height: img.height ?? null, alt: img.alt ?? null };
}

type ProviderLike = {
  _id: Types.ObjectId;
  slug: string;
  headline?: string | null;
  avatar?: Img;
  logo?: Img;
  cover?: Img;
  images?: Img[];
  location: { city: string; area?: string | null };
  ratingAvg?: number | null;
  reviewCount?: number | null;
  startingPrice?: number | null;
  experienceYears?: number | null;
  verificationStatus?: string | null;
  serviceMode?: string | null;
  offersHomeService?: boolean | null;
  distanceMeters?: number | null;
  categoryNames?: string[];
  isDemo?: boolean | null;
  displayName?: string;
  name?: string;
};

export function toProviderCard(p: ProviderLike, type: ProviderType): ProviderCardDTO {
  return {
    id: String(p._id),
    type,
    slug: p.slug,
    name: (type === "ARTIST" ? p.displayName : p.name) ?? "",
    headline: p.headline ?? null,
    avatar: toImage(p.avatar ?? p.logo),
    cover: toImage(p.cover ?? p.images?.[0]),
    city: p.location.city,
    area: p.location.area ?? null,
    rating: Math.round((p.ratingAvg ?? 0) * 10) / 10,
    reviewCount: p.reviewCount ?? 0,
    startingPrice: p.startingPrice ?? 0,
    experienceYears: p.experienceYears ?? null,
    verified: p.verificationStatus === "VERIFIED",
    serviceMode: (type === "ARTIST"
      ? p.serviceMode
      : p.offersHomeService
        ? "BOTH"
        : "STUDIO") as ServiceMode | null,
    distanceKm: p.distanceMeters != null ? Math.round(p.distanceMeters / 100) / 10 : null,
    categories: p.categoryNames ?? [],
    isDemo: p.isDemo ?? false,
  };
}

export function toService(s: {
  _id: Types.ObjectId;
  providerType: string;
  providerId: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  description?: string | null;
  includes?: string[] | null;
  price: number;
  priceType?: string | null;
  durationMin: number;
  serviceMode?: string | null;
  homeServiceFee?: number | null;
}, categoryName?: string): ServiceDTO {
  return {
    id: String(s._id),
    providerType: s.providerType as ProviderType,
    providerId: String(s.providerId),
    categoryId: String(s.categoryId),
    categoryName,
    name: s.name,
    description: s.description ?? null,
    includes: s.includes ?? [],
    price: s.price,
    priceType: (s.priceType ?? "FIXED") as ServiceDTO["priceType"],
    durationMin: s.durationMin,
    serviceMode: (s.serviceMode ?? "BOTH") as ServiceMode,
    homeServiceFee: s.homeServiceFee ?? 0,
  };
}

export function toReview(r: {
  _id: Types.ObjectId;
  rating: number;
  comment?: string | null;
  images?: Img[];
  customerName: string;
  serviceName?: string | null;
  verified?: boolean | null;
  createdAt: Date;
  reply?: { text?: string | null; at?: Date | null } | null;
}): ReviewDTO {
  // Show first name + initial only, to protect customer privacy.
  const [first, last] = r.customerName.split(/\s+/);
  return {
    id: String(r._id),
    rating: r.rating,
    comment: r.comment ?? null,
    images: (r.images ?? []).map(toImage).filter((x): x is ImageDTO => Boolean(x)),
    customerName: last ? `${first} ${last[0]}.` : (first ?? "Customer"),
    serviceName: r.serviceName ?? null,
    verified: r.verified ?? true,
    createdAt: r.createdAt.toISOString(),
    reply: r.reply?.text && r.reply.at ? { text: r.reply.text, at: r.reply.at.toISOString() } : null,
  };
}

export function toLook(
  l: {
    _id: Types.ObjectId;
    image: Img;
    title: string;
    description?: string | null;
    styleTags?: string[] | null;
    priceFrom?: number | null;
    serviceId?: Types.ObjectId | null;
  },
  provider: LookDTO["provider"],
  category?: { slug: string; name: string } | null,
): LookDTO {
  return {
    id: String(l._id),
    image: toImage(l.image)!,
    title: l.title,
    description: l.description ?? null,
    category: category ?? null,
    styleTags: l.styleTags ?? [],
    priceFrom: l.priceFrom ?? null,
    provider,
    serviceId: l.serviceId ? String(l.serviceId) : null,
  };
}

type BookingLike = {
  _id: Types.ObjectId;
  code: string;
  providerType: string;
  providerId: Types.ObjectId;
  providerSnapshot: { name: string; slug: string };
  customerId: Types.ObjectId;
  serviceId: Types.ObjectId;
  serviceSnapshot: { name: string; durationMin: number; price: number };
  dateKey: string;
  startAt: Date;
  endAt: Date;
  mode: string;
  address?: { line1?: string | null; line2?: string | null; landmark?: string | null; city?: string | null; pincode?: string | null } | null;
  pricing: { subtotal: number; homeServiceFee?: number | null; discount?: number | null; total: number };
  paymentMethod: string;
  status: string;
  paymentStatus: string;
  holdExpiresAt?: Date | null;
  customerNote?: string | null;
  reviewId?: Types.ObjectId | null;
  createdAt: Date;
};

export function toBooking(b: BookingLike, customer?: { _id: Types.ObjectId; name: string; phone?: string | null } | null): BookingDTO {
  return {
    id: String(b._id),
    code: b.code,
    provider: { id: String(b.providerId), type: b.providerType as ProviderType, name: b.providerSnapshot.name, slug: b.providerSnapshot.slug },
    customer: customer ? { id: String(customer._id), name: customer.name, phone: customer.phone ?? null } : null,
    service: { id: String(b.serviceId), ...b.serviceSnapshot },
    dateKey: b.dateKey,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    mode: b.mode as BookingDTO["mode"],
    address: b.address?.line1 ? b.address : null,
    pricing: {
      subtotal: b.pricing.subtotal,
      homeServiceFee: b.pricing.homeServiceFee ?? 0,
      discount: b.pricing.discount ?? 0,
      total: b.pricing.total,
    },
    paymentMethod: b.paymentMethod as BookingDTO["paymentMethod"],
    status: b.status as BookingDTO["status"],
    paymentStatus: b.paymentStatus as BookingDTO["paymentStatus"],
    holdExpiresAt: b.holdExpiresAt?.toISOString() ?? null,
    customerNote: b.customerNote ?? null,
    canReview: b.status === "COMPLETED" && !b.reviewId,
    reviewId: b.reviewId ? String(b.reviewId) : null,
    createdAt: b.createdAt.toISOString(),
  };
}

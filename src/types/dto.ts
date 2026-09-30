/**
 * Public API shapes. These are what the web app and the future mobile app consume —
 * never raw Mongoose documents (which can carry internal/sensitive fields).
 */
import type {
  BookingMode,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  ProviderType,
  ServiceMode,
  VerificationStatus,
  WishlistTarget,
} from "@/lib/constants";

export type ImageDTO = { url: string; width?: number | null; height?: number | null; alt?: string | null };

export type CategoryDTO = { id: string; slug: string; name: string; group: string; image?: ImageDTO | null };

export type ProviderCardDTO = {
  id: string;
  type: ProviderType;
  slug: string;
  name: string;
  headline?: string | null;
  avatar?: ImageDTO | null;
  cover?: ImageDTO | null;
  city: string;
  area?: string | null;
  rating: number;
  reviewCount: number;
  startingPrice: number; // paise
  experienceYears?: number | null;
  verified: boolean;
  serviceMode?: ServiceMode | null;
  distanceKm?: number | null;
  categories: string[];
  isDemo?: boolean;
};

export type ServiceDTO = {
  id: string;
  providerType: ProviderType;
  providerId: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  description?: string | null;
  includes: string[];
  price: number;
  priceType: "FIXED" | "STARTING_AT";
  durationMin: number;
  serviceMode: ServiceMode;
  homeServiceFee: number;
};

export type LookDTO = {
  id: string;
  image: ImageDTO;
  title: string;
  description?: string | null;
  category?: { slug: string; name: string } | null;
  styleTags: string[];
  priceFrom?: number | null;
  provider: { id: string; type: ProviderType; slug: string; name: string; avatar?: ImageDTO | null; verified: boolean };
  serviceId?: string | null;
};

export type ReviewDTO = {
  id: string;
  rating: number;
  comment?: string | null;
  images: ImageDTO[];
  customerName: string;
  serviceName?: string | null;
  verified: boolean;
  createdAt: string;
  reply?: { text: string; at: string } | null;
};

export type ArtistProfileDTO = ProviderCardDTO & {
  type: "ARTIST";
  bio?: string | null;
  languages: string[];
  styles: string[];
  serviceRadiusKm?: number | null;
  socialLinks?: Record<string, string | null | undefined> | null;
  policies?: { cancellation?: string | null; advancePercent?: number | null; travelNote?: string | null } | null;
  salon?: { id: string; slug: string; name: string } | null;
  memberSince: string;
  location: { lng: number; lat: number };
};

export type OpeningHoursDTO = { day: number; isOpen: boolean; open?: string | null; close?: string | null };

export type SalonProfileDTO = ProviderCardDTO & {
  type: "SALON";
  description?: string | null;
  images: ImageDTO[];
  openingHours: OpeningHoursDTO[];
  amenities: string[];
  address?: string | null;
  contactPhone?: string | null;
  offersHomeService: boolean;
  staff: ProviderCardDTO[];
  location: { lng: number; lat: number };
  memberSince: string;
};

export type SlotDTO = { time: string; startAt: string; endAt: string; available: boolean };

export type BookingDTO = {
  id: string;
  code: string;
  provider: { id: string; type: ProviderType; name: string; slug: string };
  customer?: { id: string; name: string; phone?: string | null } | null;
  service: { id: string; name: string; durationMin: number; price: number };
  dateKey: string;
  startAt: string;
  endAt: string;
  mode: BookingMode;
  address?: { line1?: string | null; line2?: string | null; landmark?: string | null; city?: string | null; pincode?: string | null } | null;
  pricing: { subtotal: number; homeServiceFee: number; discount: number; total: number };
  paymentMethod: PaymentMethod;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  holdExpiresAt?: string | null;
  customerNote?: string | null;
  canReview: boolean;
  reviewId?: string | null;
  createdAt: string;
};

export type WishlistItemDTO = {
  id: string;
  targetType: WishlistTarget;
  targetId: string;
  createdAt: string;
  provider?: ProviderCardDTO | null;
  look?: LookDTO | null;
};

export type NotificationDTO = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type Paginated<T> = { items: T[]; page: number; limit: number; total: number; hasMore: boolean };

export type PartnerSummaryDTO = {
  type: ProviderType;
  id: string;
  slug: string;
  name: string;
  verificationStatus: VerificationStatus;
};

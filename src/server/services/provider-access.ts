import "server-only";
import type { ClientSession, Types } from "mongoose";
import type { ProviderType } from "@/lib/constants";
import type { AuthUser } from "@/server/auth/current-user";
import { errors } from "@/server/http/errors";
import { Artist, Salon } from "@/server/models";

/** Normalised view of an artist or salon for booking/availability logic. */
export type ProviderRef = {
  type: ProviderType;
  id: Types.ObjectId;
  ownerUserId: Types.ObjectId;
  name: string;
  slug: string;
  city: string;
  point: [number, number];
  offersHome: boolean;
  offersStudio: boolean;
  serviceRadiusKm: number;
  isActive: boolean;
  verificationStatus: string;
};

export async function loadProvider(type: ProviderType, id: string | Types.ObjectId, session?: ClientSession): Promise<ProviderRef> {
  if (type === "ARTIST") {
    const a = await Artist.findById(id).session(session ?? null).lean();
    if (!a) throw errors.notFound("Artist");
    return {
      type,
      id: a._id,
      ownerUserId: a.userId,
      name: a.displayName,
      slug: a.slug,
      city: a.location.city,
      point: a.location.point.coordinates as [number, number],
      offersHome: a.serviceMode !== "STUDIO",
      offersStudio: a.serviceMode !== "HOME",
      serviceRadiusKm: a.serviceRadiusKm ?? 15,
      isActive: a.isActive,
      verificationStatus: a.verificationStatus,
    };
  }
  const s = await Salon.findById(id).session(session ?? null).lean();
  if (!s) throw errors.notFound("Salon");
  return {
    type,
    id: s._id,
    ownerUserId: s.ownerId,
    name: s.name,
    slug: s.slug,
    city: s.location.city,
    point: s.location.point.coordinates as [number, number],
    offersHome: Boolean(s.offersHomeService),
    offersStudio: true,
    serviceRadiusKm: 15,
    isActive: s.isActive,
    verificationStatus: s.verificationStatus,
  };
}

/** The artist/salon profile owned by a partner user. */
export async function getOwnedProvider(user: AuthUser): Promise<ProviderRef> {
  if (user.role === "ARTIST") {
    const a = await Artist.findOne({ userId: user.id }).select("_id").lean();
    if (!a) throw errors.notFound("Artist profile");
    return loadProvider("ARTIST", a._id);
  }
  if (user.role === "SALON") {
    const s = await Salon.findOne({ ownerId: user.id }).select("_id").lean();
    if (!s) throw errors.notFound("Salon profile");
    return loadProvider("SALON", s._id);
  }
  throw errors.forbidden("Partner account required");
}

export function isOwner(user: AuthUser, provider: ProviderRef) {
  return String(provider.ownerUserId) === user.id;
}

/** Great-circle distance in km between [lng, lat] points. */
export function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

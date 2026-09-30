import "server-only";
import { Types } from "mongoose";
import type { z } from "zod";
import type { SavedAddressInput, updateProfileSchema } from "@/lib/validation/account";
import { errors } from "@/server/http/errors";
import { Booking, Notification, User, WishlistItem } from "@/server/models";
import { revokeAllSessions } from "@/server/auth/session";

const MAX_ADDRESSES = 10;

function toAddress(a: {
  _id: Types.ObjectId;
  label?: string | null;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  pincode?: string | null;
  isDefault?: boolean | null;
}) {
  return {
    id: String(a._id),
    label: a.label ?? "Address",
    line1: a.line1,
    line2: a.line2 ?? undefined,
    landmark: a.landmark ?? undefined,
    city: a.city,
    pincode: a.pincode ?? undefined,
    isDefault: Boolean(a.isDefault),
  };
}
export type AddressDTO = ReturnType<typeof toAddress>;

export const accountService = {
  async getProfile(userId: string) {
    const u = await User.findById(userId).select("name email phone role avatarUrl defaultCity notificationPrefs createdAt passwordHash").select("+passwordHash").lean();
    if (!u) throw errors.notFound("User");
    return {
      id: String(u._id),
      name: u.name,
      email: u.email ?? null,
      phone: u.phone ?? null,
      role: u.role,
      avatarUrl: u.avatarUrl ?? null,
      defaultCity: u.defaultCity ?? null,
      notificationPrefs: { email: u.notificationPrefs?.email ?? true, marketing: u.notificationPrefs?.marketing ?? false },
      hasPassword: Boolean(u.passwordHash),
      memberSince: u.createdAt.toISOString(),
    };
  },

  async updateProfile(userId: string, input: z.infer<typeof updateProfileSchema>) {
    const set: Record<string, unknown> = {};
    const unset: Record<string, 1> = {};
    if (input.name) set.name = input.name;
    if (input.defaultCity !== undefined) set.defaultCity = input.defaultCity;
    if (input.phone === "") unset.phone = 1;
    else if (input.phone) {
      if (await User.exists({ phone: input.phone, _id: { $ne: userId } })) throw errors.validation({ phone: ["This number is linked to another account"] });
      set.phone = input.phone;
    }
    if (input.notificationPrefs?.email !== undefined) set["notificationPrefs.email"] = input.notificationPrefs.email;
    if (input.notificationPrefs?.marketing !== undefined) set["notificationPrefs.marketing"] = input.notificationPrefs.marketing;
    await User.updateOne({ _id: userId }, { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) });
    return this.getProfile(userId);
  },

  async listAddresses(userId: string): Promise<AddressDTO[]> {
    const u = await User.findById(userId).select("addresses").lean();
    return (u?.addresses ?? []).map(toAddress);
  },

  async addAddress(userId: string, input: SavedAddressInput) {
    const u = await User.findById(userId).select("addresses");
    if (!u) throw errors.notFound("User");
    if (u.addresses.length >= MAX_ADDRESSES) throw errors.conflict(`You can save up to ${MAX_ADDRESSES} addresses`);
    const makeDefault = input.isDefault || u.addresses.length === 0;
    if (makeDefault) u.addresses.forEach((a) => (a.isDefault = false));
    u.addresses.push({
      label: input.label,
      line1: input.line1,
      line2: input.line2,
      landmark: input.landmark,
      city: input.city,
      pincode: input.pincode || undefined,
      point: input.coordinates ? { type: "Point", coordinates: input.coordinates } : undefined,
      isDefault: makeDefault,
    });
    await u.save();
    return u.addresses.map((a) => toAddress(a));
  },

  async removeAddress(userId: string, addressId: string) {
    if (!Types.ObjectId.isValid(addressId)) throw errors.notFound("Address");
    const res = await User.updateOne({ _id: userId }, { $pull: { addresses: { _id: new Types.ObjectId(addressId) } } });
    if (res.modifiedCount === 0) throw errors.notFound("Address");
    return this.listAddresses(userId);
  },

  async overview(userId: string) {
    const uid = new Types.ObjectId(userId);
    const now = new Date();
    const [upcoming, completed, saved, unread] = await Promise.all([
      Booking.countDocuments({ customerId: uid, status: { $in: ["PENDING", "CONFIRMED"] }, endAt: { $gte: now } }),
      Booking.countDocuments({ customerId: uid, status: "COMPLETED" }),
      WishlistItem.countDocuments({ userId: uid }),
      Notification.countDocuments({ userId: uid, readAt: null }),
    ]);
    return { upcoming, completed, saved, unread };
  },

  signOutEverywhere: (userId: string) => revokeAllSessions(userId),
};

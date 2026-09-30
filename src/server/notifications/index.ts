import "server-only";
import type { Types } from "mongoose";
import type { NotificationType } from "@/lib/constants";
import { childLogger } from "@/lib/logger";
import { Notification, User } from "@/server/models";
import { getEmailSender } from "./email";

const log = childLogger("notifications");

export type NotificationMessage = {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  data?: Record<string, unknown>;
  /** Also send by email (respects the user's email preference). */
  email?: { subject: string; html: string };
};

/**
 * Delivery channels. In-app and email today; implement `PushChannel` with
 * Firebase Cloud Messaging later and add it to `channels` — call sites don't change.
 */
export interface NotificationChannel {
  readonly name: "IN_APP" | "EMAIL" | "PUSH";
  deliver(userId: string, msg: NotificationMessage): Promise<boolean>;
}

const inApp: NotificationChannel = {
  name: "IN_APP",
  async deliver(userId, msg) {
    await Notification.create({ userId, type: msg.type, title: msg.title, body: msg.body, link: msg.link, data: msg.data });
    return true;
  },
};

const email: NotificationChannel = {
  name: "EMAIL",
  async deliver(userId, msg) {
    if (!msg.email) return false;
    const user = await User.findById(userId).select("email notificationPrefs").lean();
    if (!user?.email || user.notificationPrefs?.email === false) return false;
    await getEmailSender().send({ to: user.email, subject: msg.email.subject, html: msg.email.html });
    return true;
  },
};

const channels: NotificationChannel[] = [inApp, email];

export const notificationService = {
  /** Deliver on all channels. Never throws — a failed email must not fail a booking. */
  async notify(userId: string | Types.ObjectId, msg: NotificationMessage) {
    await Promise.all(
      channels.map(async (c) => {
        try {
          await c.deliver(String(userId), msg);
        } catch (err) {
          log.error({ err, channel: c.name, type: msg.type }, "Notification delivery failed");
        }
      }),
    );
  },

  async list(userId: string, page: number, limit: number) {
    const [items, total, unread] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, readAt: null }),
    ]);
    return {
      items: items.map((n) => ({
        id: String(n._id),
        type: n.type,
        title: n.title,
        body: n.body ?? null,
        link: n.link ?? null,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      page,
      limit,
      total,
      hasMore: page * limit < total,
      unread,
    };
  },

  async markRead(userId: string, ids: string[] | "all") {
    const filter = ids === "all" ? { userId, readAt: null } : { userId, _id: { $in: ids }, readAt: null };
    const res = await Notification.updateMany(filter, { $set: { readAt: new Date() } });
    return { updated: res.modifiedCount };
  },
};

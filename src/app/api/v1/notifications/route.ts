import { z } from "zod";
import { objectId, pageQuery } from "@/lib/validation/common";
import { api, ok } from "@/server/http/handler";
import { notificationService } from "@/server/notifications";

export const GET = api({ auth: "required", query: pageQuery }, async ({ query, user }) => {
  const { items, ...meta } = await notificationService.list(user.id, query.page, query.limit);
  return ok(items, meta);
});

const markRead = z.object({ ids: z.union([z.literal("all"), z.array(objectId).max(100)]) });

export const PATCH = api({ auth: "required", body: markRead }, async ({ body, user }) =>
  notificationService.markRead(user.id, body.ids),
);

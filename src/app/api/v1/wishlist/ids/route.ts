import { z } from "zod";
import { WISHLIST_TARGETS } from "@/lib/constants";
import { objectId } from "@/lib/validation/common";
import { api } from "@/server/http/handler";
import { wishlistService } from "@/server/services/wishlist.service";

const query = z.object({ type: z.enum(WISHLIST_TARGETS).optional() });

/** Saved target ids (for heart toggles). Anonymous users get []. */
export const GET = api({ auth: "optional", query }, async ({ query, user }) =>
  user ? wishlistService.savedIds(user, query.type) : [],
);

/** Remove by target (used by heart toggles). */
export const DELETE = api(
  { auth: "required", body: z.object({ targetType: z.enum(WISHLIST_TARGETS), targetId: objectId }), rateLimit: "write" },
  async ({ body, user }) => wishlistService.remove(user, body),
);

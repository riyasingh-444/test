import { api } from "@/server/http/handler";
import { wishlistService } from "@/server/services/wishlist.service";

/** Remove by wishlist item id. */
export const DELETE = api<{ id: string }, undefined, undefined, "required">(
  { auth: "required", rateLimit: "write" },
  async ({ params, user }) => wishlistService.remove(user, { id: params.id }),
);

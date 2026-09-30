import { reviewReplySchema } from "@/lib/validation/engagement";
import { api } from "@/server/http/handler";
import { reviewService } from "@/server/services/review.service";

export const POST = api<{ id: string }, undefined, typeof reviewReplySchema, "required">(
  { auth: "required", roles: ["ARTIST", "SALON"], body: reviewReplySchema, rateLimit: "write" },
  async ({ params, body, user }) => reviewService.reply(user, params.id, body.text),
);

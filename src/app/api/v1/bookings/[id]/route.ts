import { bookingActionSchema } from "@/lib/validation/booking";
import { api } from "@/server/http/handler";
import { bookingService } from "@/server/services/booking.service";

export const GET = api<{ id: string }, undefined, undefined, "required">({ auth: "required" }, async ({ params, user }) =>
  bookingService.getForUser(user, params.id),
);

/** Status transitions: cancel | accept | reject | complete | no_show. */
export const PATCH = api<{ id: string }, undefined, typeof bookingActionSchema, "required">(
  { auth: "required", body: bookingActionSchema, rateLimit: "write" },
  async ({ params, body, user }) => bookingService.transition(user, params.id, body.action, body.reason),
);

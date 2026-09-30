import { bookingListSchema, createBookingSchema } from "@/lib/validation/booking";
import { api, ok } from "@/server/http/handler";
import { bookingService } from "@/server/services/booking.service";

export const POST = api({ auth: "required", body: createBookingSchema, rateLimit: "write" }, async ({ body, user }) => {
  const booking = await bookingService.create(user, body);
  return ok(booking, undefined, { status: 201 });
});

/** ?as=customer (default) lists my bookings; ?as=provider lists bookings for my partner profile. */
export const GET = api({ auth: "required", query: bookingListSchema }, async ({ query, user }) => {
  const { items, ...meta } = await bookingService.list(user, query);
  return ok(items, meta);
});

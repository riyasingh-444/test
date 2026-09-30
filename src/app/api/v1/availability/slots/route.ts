import { slotsQuerySchema } from "@/lib/validation/booking";
import { api } from "@/server/http/handler";
import { availabilityService } from "@/server/services/availability.service";

/** Bookable time slots for a service on a date (provider timezone). */
export const GET = api({ query: slotsQuerySchema, rateLimit: "read" }, async ({ query }) =>
  availabilityService.getSlots(query.serviceId, query.date),
);

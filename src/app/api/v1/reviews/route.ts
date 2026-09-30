import { createReviewSchema, reviewListSchema } from "@/lib/validation/engagement";
import { api, ok } from "@/server/http/handler";
import { errors } from "@/server/http/errors";
import { discoveryService } from "@/server/services/discovery.service";
import { reviewService } from "@/server/services/review.service";

export const POST = api({ auth: "required", body: createReviewSchema, rateLimit: "write" }, async ({ body, user }) => {
  const review = await reviewService.create(user, body);
  return ok(review, undefined, { status: 201 });
});

/** ?providerId= for public reviews, ?mine=true for the signed-in customer's reviews. */
export const GET = api({ auth: "optional", query: reviewListSchema }, async ({ query, user }) => {
  if (query.mine === "true") {
    if (!user) throw errors.unauthenticated();
    const { items, ...meta } = await reviewService.listMine(user, query.page, query.limit);
    return ok(items, meta);
  }
  if (!query.providerId) throw errors.validation({ providerId: ["providerId is required"] });
  const { items, ...meta } = await discoveryService.listReviews(query.providerId, query.page, query.limit);
  return ok(items, meta);
});

import type { PipelineStage } from "mongoose";

/**
 * "Recommended" ordering. This is a transparent, explainable heuristic — NOT a
 * personalised model. Swap in a learned ranker (or per-user signals) by providing
 * another RankingStrategy; the search service only depends on this interface.
 */
export interface RankingStrategy {
  readonly name: string;
  /** Aggregation stages that add a numeric `_score` field. */
  scoreStages(ctx: { hasGeo: boolean }): PipelineStage[];
}

export const heuristicRanking: RankingStrategy = {
  name: "heuristic-v1",
  scoreStages: ({ hasGeo }) => [
    {
      $addFields: {
        _score: {
          $add: [
            // Bayesian-smoothed rating: pulls low-review profiles toward a 4.0 prior.
            {
              $divide: [
                { $add: [{ $multiply: ["$ratingAvg", "$reviewCount"] }, 4 * 5] },
                { $add: ["$reviewCount", 5] },
              ],
            },
            { $multiply: [0.15, { $ln: { $add: [1, "$bookingCount"] } }] },
            { $cond: [{ $eq: ["$verificationStatus", "VERIFIED"] }, 0.35, 0] },
            // Mild proximity preference when the user shared a location.
            ...(hasGeo ? [{ $multiply: [-0.02, { $divide: ["$distanceMeters", 1000] }] }] : []),
          ],
        },
      },
    },
  ],
};

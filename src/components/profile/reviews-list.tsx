"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import type { ReviewDTO } from "@/types/dto";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "./profile-parts";

export function ReviewsList({ providerId, initial, total }: { providerId: string; initial: ReviewDTO[]; total: number }) {
  const [items, setItems] = useState(initial);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const more = async () => {
    setLoading(true);
    try {
      const res = await api.get<ReviewDTO[]>("/reviews", { providerId, page: page + 1, limit: 6 });
      setItems((p) => [...p, ...res.data]);
      setPage((p) => p + 1);
    } finally {
      setLoading(false);
    }
  };
  if (items.length === 0) return <p className="text-sm text-muted">No reviews yet — reviews appear after completed bookings.</p>;
  return (
    <div>
      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((r) => (
          <li key={r.id}>
            <ReviewCard review={r} />
          </li>
        ))}
      </ul>
      {items.length < total && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={more} loading={loading}>
            Show more reviews
          </Button>
        </div>
      )}
    </div>
  );
}

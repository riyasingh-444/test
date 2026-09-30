"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/states";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page py-24">
      <ErrorState
        title="Something went wrong"
        description="We hit a snag loading this page. Please try again — if it keeps happening, check your connection."
        retry={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}

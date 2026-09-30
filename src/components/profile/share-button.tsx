"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

export function ShareButton({ title }: { title: string }) {
  const share = async () => {
    const url = window.location.href.split("?")[0]!;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      className="grid size-10 place-items-center rounded-full border border-line bg-surface text-primary transition hover:bg-primary-soft"
      aria-label={`Share ${title}`}
    >
      <Share2 className="size-4" aria-hidden="true" />
    </button>
  );
}

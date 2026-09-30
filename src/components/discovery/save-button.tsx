"use client";

import { Heart } from "lucide-react";
import type { WishlistTarget } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/components/providers/app-providers";

export function SaveButton({
  type,
  id,
  label,
  className,
  variant = "glass",
}: {
  type: WishlistTarget;
  id: string;
  label: string;
  className?: string;
  variant?: "glass" | "plain";
}) {
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(type, id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(type, id, label);
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${label} from wishlist` : `Save ${label} to wishlist`}
      className={cn(
        "grid size-9 place-items-center rounded-full transition duration-200 active:scale-90",
        variant === "glass" ? "bg-white/90 shadow-xs backdrop-blur hover:bg-white" : "hover:bg-primary-soft",
        className,
      )}
    >
      <Heart
        className={cn("size-[18px] transition-colors", saved ? "fill-rose text-rose" : "text-primary")}
        aria-hidden="true"
      />
    </button>
  );
}

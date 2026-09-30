"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { payForBooking } from "@/lib/razorpay-client";
import { cn } from "@/lib/utils";
import type { BookingDTO } from "@/types/dto";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { ImageUploader, type UploadedImage } from "@/components/uploads/image-uploader";

export function CancelBookingButton({ booking, label = "Cancel booking", action = "cancel" }: { booking: BookingDTO; label?: string; action?: "cancel" | "reject" }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.patch(`/bookings/${booking.id}`, { action, reason: reason.trim() || undefined });
      toast.success(action === "cancel" ? "Booking cancelled" : "Booking declined");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update the booking");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">{label}</Button>
      </DialogTrigger>
      <DialogContent
        title={action === "cancel" ? "Cancel this booking?" : "Decline this booking?"}
        description={
          action === "cancel"
            ? booking.paymentStatus === "PAID"
              ? "Your payment will be refunded to the original method as per the cancellation policy."
              : "The time slot will be released."
            : "The customer will be notified and any payment refunded."
        }
      >
        <Field id="reason" label="Reason (optional)">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className="min-h-20" />
        </Field>
        <div className="mt-6 flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="ghost">Keep booking</Button>
          </DialogClose>
          <Button variant="danger" onClick={submit} loading={busy}>
            {action === "cancel" ? "Cancel booking" : "Decline"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PayNowButton({ booking }: { booking: BookingDTO }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await payForBooking(booking.id, `${booking.service.name} with ${booking.provider.name}`);
          if (r.status === "paid") toast.success("Payment successful — your booking is confirmed");
          else if (r.status === "failed") toast.error(r.message);
          router.refresh();
        } catch (e) {
          toast.error(e instanceof ApiError ? e.message : "Couldn't start payment");
        } finally {
          setBusy(false);
        }
      }}
    >
      Complete payment
    </Button>
  );
}

export function ReviewForm({ booking, uploadsEnabled }: { booking: BookingDTO; uploadsEnabled: boolean }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return setError("Choose a star rating");
    setBusy(true);
    setError(null);
    try {
      await api.post("/reviews", { bookingId: booking.id, rating, comment: comment.trim() || undefined, images });
      toast.success("Thank you — your review is live");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit your review");
    } finally {
      setBusy(false);
    }
  };
  const labels = ["", "Poor", "Fair", "Good", "Great", "Loved it"];
  return (
    <form onSubmit={submit} className="rounded-3xl bg-surface p-6 shadow-card" id="review">
      <h2 className="text-3xl">How was your experience?</h2>
      <p className="mt-1 text-sm text-muted">Your review will show a Verified booking badge.</p>
      <fieldset className="mt-5">
        <legend className="sr-only">Rating</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input type="radio" name="rating" value={n} className="peer sr-only" checked={rating === n} onChange={() => setRating(n)} />
              <Star
                className={cn("size-9 transition peer-focus-visible:outline-2 peer-focus-visible:outline-primary", (hover || rating) >= n ? "fill-gold text-gold" : "fill-transparent text-line-strong")}
                aria-hidden="true"
              />
              <span className="sr-only">{n} star{n > 1 ? "s" : ""}</span>
            </label>
          ))}
          <span className="ml-3 text-sm font-medium text-ink">{labels[hover || rating]}</span>
        </div>
      </fieldset>
      <Field id="comment" label="Tell others about it" className="mt-5">
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} placeholder="What did you love? How long did the look last?" />
      </Field>
      {uploadsEnabled && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-ink">Add photos (optional)</p>
          <ImageUploader folder="reviews" max={6} value={images} onChange={setImages} />
        </div>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
      <Button type="submit" className="mt-6" loading={busy}>
        Submit review
      </Button>
    </form>
  );
}

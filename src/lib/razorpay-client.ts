"use client";

import { api } from "./api-client";

/**
 * Razorpay Checkout (browser). The server creates the order and later verifies the
 * signature — the client-side "success" callback is never trusted on its own.
 */
type RazorpayOrder = { orderId: string; amount: number; currency: string; keyId: string; bookingId: string; prefill?: { name?: string; email?: string; contact?: string } };

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void };
  }
}

function loadScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load the payment window. Check your connection."));
    document.body.appendChild(s);
  });
}

export type PaymentOutcome = { status: "paid" } | { status: "failed"; message: string } | { status: "dismissed" };

export async function payForBooking(bookingId: string, description: string): Promise<PaymentOutcome> {
  const { data: order } = await api.post<RazorpayOrder>("/payments/create", { bookingId });
  await loadScript();
  return new Promise<PaymentOutcome>((resolve) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "Rivya",
      description,
      prefill: order.prefill,
      theme: { color: "#5B0E2D" },
      handler: async (res: RazorpayResponse) => {
        try {
          await api.post("/payments/verify", {
            bookingId,
            orderId: res.razorpay_order_id,
            paymentId: res.razorpay_payment_id,
            signature: res.razorpay_signature,
          });
          resolve({ status: "paid" });
        } catch (e) {
          resolve({ status: "failed", message: e instanceof Error ? e.message : "Payment verification failed" });
        }
      },
      modal: { ondismiss: () => resolve({ status: "dismissed" }) },
    });
    rzp.on("payment.failed", (r) => {
      const err = (r as { error?: { description?: string } }).error;
      resolve({ status: "failed", message: err?.description ?? "Payment failed" });
    });
    rzp.open();
  });
}

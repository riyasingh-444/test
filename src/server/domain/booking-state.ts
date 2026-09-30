import type { BookingStatus, Role } from "@/lib/constants";
import type { BookingAction } from "@/lib/validation/booking";

/**
 * Booking state machine — the single source of truth for who may move a booking where.
 *
 *   PENDING ──accept(partner)──▶ CONFIRMED ──complete──▶ COMPLETED
 *      │  └─payment verified──▶ CONFIRMED      └─no_show─▶ NO_SHOW
 *      ├─cancel(customer)─▶ CANCELLED ◀─cancel(customer, before start)─┘
 *      └─reject(partner)──▶ REJECTED  ◀─reject(partner, before start)──┘
 */
type Actor = "CUSTOMER" | "PROVIDER" | "ADMIN";

const RULES: Record<BookingAction, { from: BookingStatus[]; to: BookingStatus; actors: Actor[]; timing?: "before_start" | "after_start" }> = {
  cancel: { from: ["PENDING", "CONFIRMED"], to: "CANCELLED", actors: ["CUSTOMER", "ADMIN"], timing: "before_start" },
  accept: { from: ["PENDING"], to: "CONFIRMED", actors: ["PROVIDER", "ADMIN"], timing: "before_start" },
  reject: { from: ["PENDING", "CONFIRMED"], to: "REJECTED", actors: ["PROVIDER", "ADMIN"], timing: "before_start" },
  complete: { from: ["CONFIRMED"], to: "COMPLETED", actors: ["PROVIDER", "ADMIN"], timing: "after_start" },
  no_show: { from: ["CONFIRMED"], to: "NO_SHOW", actors: ["PROVIDER", "ADMIN"], timing: "after_start" },
};

export type TransitionCheck =
  | { ok: true; to: BookingStatus }
  | { ok: false; reason: string };

export function checkTransition(args: {
  action: BookingAction;
  actor: Actor;
  status: BookingStatus;
  paymentMethod: string;
  paymentStatus: string;
  startAt: Date;
  now?: Date;
}): TransitionCheck {
  const rule = RULES[args.action];
  const now = args.now ?? new Date();
  if (!rule.actors.includes(args.actor)) return { ok: false, reason: "You can't perform this action on this booking" };
  if (!rule.from.includes(args.status)) return { ok: false, reason: `A ${args.status.toLowerCase()} booking can't be ${pastTense(args.action)}` };
  if (rule.timing === "before_start" && now >= args.startAt) return { ok: false, reason: "This booking has already started" };
  if (rule.timing === "after_start" && now < args.startAt) return { ok: false, reason: "This booking hasn't started yet" };
  // Online bookings are confirmed by payment, not by the partner.
  if (args.action === "accept" && args.paymentMethod === "ONLINE" && args.paymentStatus !== "PAID") {
    return { ok: false, reason: "Awaiting customer payment" };
  }
  return { ok: true, to: rule.to };
}

export function actorFor(role: Role, isCustomer: boolean, isProvider: boolean): Actor | null {
  if (role === "ADMIN") return "ADMIN";
  if (isProvider) return "PROVIDER";
  if (isCustomer) return "CUSTOMER";
  return null;
}

function pastTense(a: BookingAction) {
  return { cancel: "cancelled", accept: "accepted", reject: "rejected", complete: "completed", no_show: "marked no-show" }[a];
}

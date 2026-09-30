"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, ChevronLeft, Clock, Home, MapPin, Store, Tag, Wallet, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { payForBooking } from "@/lib/razorpay-client";
import { addDaysToKey, todayKey } from "@/lib/time";
import { cn, formatPaise, initials } from "@/lib/utils";
import type { BookingDTO, ServiceDTO, SlotDTO } from "@/types/dto";
import type { BookingMode, PaymentMethod, ProviderType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";

type Provider = {
  id: string;
  type: ProviderType;
  slug: string;
  name: string;
  avatar?: string | null;
  city: string;
  address?: string | null;
  offersHome: boolean;
  offersStudio: boolean;
};
type SavedAddress = { id: string; label: string; line1: string; line2?: string; landmark?: string; city: string; pincode?: string };

const STEPS = ["Service", "Date & time", "Location", "Review"] as const;
const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const asDate = (k: string) => new Date(`${k}T00:00:00Z`);

export function BookingWizard({
  provider,
  services,
  addresses,
  paymentsEnabled,
  initial,
}: {
  provider: Provider;
  services: ServiceDTO[];
  addresses: SavedAddress[];
  paymentsEnabled: boolean;
  initial: { serviceId?: string; date?: string; time?: string };
}) {
  const router = useRouter();
  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => addDaysToKey(todayKey(), i)), []);
  const initialService = services.find((s) => s.id === initial.serviceId);
  const [step, setStep] = useState(initialService ? (initial.date && initial.time ? 2 : 1) : 0);
  const [serviceId, setServiceId] = useState(initialService?.id ?? "");
  const [date, setDate] = useState(initial.date && days.includes(initial.date) ? initial.date : days[0]!);
  const [time, setTime] = useState(initial.time ?? "");
  // Slot results are keyed by the request they answer, so loading/stale states are derived, not reset in effects.
  const [slotResult, setSlotResult] = useState<{ key: string; slots?: SlotDTO[]; error?: string } | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const slotKey = `${serviceId}|${date}|${reloadTick}`;
  const slots = slotResult?.key === slotKey ? (slotResult.slots ?? null) : null;
  const slotError = slotResult?.key === slotKey ? (slotResult.error ?? null) : null;
  const service = services.find((s) => s.id === serviceId);

  const modes: BookingMode[] = useMemo(() => {
    if (!service) return [];
    const m: BookingMode[] = [];
    if (service.serviceMode !== "HOME" && provider.offersStudio) m.push("STUDIO");
    if (service.serviceMode !== "STUDIO" && provider.offersHome) m.push("HOME");
    return m;
  }, [service, provider]);
  const [preferredMode, setMode] = useState<BookingMode>("STUDIO");
  const mode: BookingMode = modes.includes(preferredMode) ? preferredMode : (modes[0] ?? "STUDIO");

  const [addressId, setAddressId] = useState<string>(addresses[0]?.id ?? "new");
  const [address, setAddress] = useState({ line1: "", line2: "", landmark: "", city: provider.city, pincode: "" });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [offerCode, setOfferCode] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>(paymentsEnabled ? "ONLINE" : "PAY_AT_VENUE");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load slots whenever service/date changes.
  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    api
      .get<{ slots: SlotDTO[] }>("/availability/slots", { serviceId, date })
      .then((r) => !cancelled && setSlotResult({ key: slotKey, slots: r.data.slots }))
      .catch((e) => !cancelled && setSlotResult({ key: slotKey, error: e instanceof ApiError ? e.message : "Couldn't load times" }));
    return () => {
      cancelled = true;
    };
  }, [serviceId, date, slotKey]);

  const openSlots = slots?.filter((s) => s.available) ?? [];
  // A previously chosen time that is no longer open counts as unselected.
  const selectedTime = openSlots.some((s) => s.time === time) ? time : "";
  const homeFee = mode === "HOME" ? (service?.homeServiceFee ?? 0) : 0;
  const total = (service?.price ?? 0) + homeFee;

  const selectedAddress = () => {
    if (addressId !== "new") {
      const a = addresses.find((x) => x.id === addressId)!;
      return { line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, pincode: a.pincode };
    }
    return {
      line1: address.line1.trim(),
      line2: address.line2.trim() || undefined,
      landmark: address.landmark.trim() || undefined,
      city: address.city.trim(),
      pincode: address.pincode.trim() || undefined,
    };
  };

  const validateLocation = () => {
    if (mode !== "HOME" || addressId !== "new") return true;
    const errs: Record<string, string> = {};
    if (address.line1.trim().length < 3) errs.line1 = "Enter your address";
    if (address.city.trim().length < 2) errs.city = "Enter your city";
    if (address.pincode && !/^\d{6}$/.test(address.pincode.trim())) errs.pincode = "Enter a 6-digit pincode";
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const canContinue = [Boolean(service), Boolean(selectedTime), modes.length > 0, true][step];

  const next = () => {
    if (step === 2 && !validateLocation()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirm = async () => {
    if (!service) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data: booking } = await api.post<BookingDTO>("/bookings", {
        providerType: provider.type,
        providerId: provider.id,
        serviceId: service.id,
        date,
        time: selectedTime,
        mode,
        address: mode === "HOME" ? selectedAddress() : undefined,
        note: note.trim() || undefined,
        paymentMethod: payment,
        offerCode: offerCode.trim() || undefined,
      });
      if (payment === "ONLINE") {
        const outcome = await payForBooking(booking.id, `${service.name} with ${provider.name}`);
        if (outcome.status === "failed") toast.error(`Payment failed: ${outcome.message}. Your slot is held for a few minutes — you can retry from your booking.`);
        if (outcome.status === "dismissed") toast.message("Payment not completed. Your slot is held for a few minutes — finish payment from your booking.");
      }
      router.replace(`/account/bookings/${booking.id}?new=1`);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "SLOT_UNAVAILABLE") {
          setStep(1);
          setTime("");
          toast.error("Someone just booked that time. Please pick another slot.");
          setReloadTick((t) => t + 1);
        } else {
          setSubmitError(e.fieldError("offerCode") ?? e.fieldError("address") ?? e.fieldError("paymentMethod") ?? e.message);
        }
      } else setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        {/* Stepper */}
        <ol className="mb-8 flex items-center gap-2 text-sm" aria-label="Booking steps">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                disabled={i > step}
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap",
                  i === step ? "font-semibold text-primary" : i < step ? "text-ink" : "text-subtle",
                )}
              >
                <span className={cn("grid size-7 place-items-center rounded-full text-xs", i < step ? "bg-primary text-white" : i === step ? "border-2 border-primary" : "border border-line-strong")}>
                  {i < step ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
                </span>
                <span className={cn(i !== step && "hidden sm:inline")}>{label}</span>
              </button>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" aria-hidden="true" />}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <section aria-labelledby="s0">
            <h2 id="s0" className="text-3xl">Choose a service</h2>
            <ul className="mt-6 space-y-3" role="radiogroup" aria-labelledby="s0">
              {services.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={serviceId === s.id}
                    onClick={() => setServiceId(s.id)}
                    className={cn(
                      "flex w-full items-start justify-between gap-4 rounded-2xl border bg-surface p-5 text-left transition",
                      serviceId === s.id ? "border-primary ring-4 ring-primary/8" : "border-line hover:border-primary/30",
                    )}
                  >
                    <span>
                      <span className="block font-medium text-ink">{s.name}</span>
                      <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{s.durationMin} min</span>
                        {s.categoryName && <span>{s.categoryName}</span>}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold text-ink">{formatPaise(s.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="s1">
            <h2 id="s1" className="text-3xl">Pick a date & time</h2>
            <p className="mt-1 text-sm text-muted">{longDate.format(asDate(date))} · times in IST</p>
            <div className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2" role="radiogroup" aria-label="Date">
              {days.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={d === date}
                  onClick={() => setDate(d)}
                  className={cn(
                    "flex w-[4.5rem] shrink-0 flex-col items-center rounded-2xl border py-3 transition",
                    d === date ? "border-primary bg-primary text-white" : "border-line bg-surface hover:border-primary/30",
                  )}
                >
                  <span className={cn("text-[11px] uppercase", d === date ? "text-white/80" : "text-muted")}>{i === 0 ? "Today" : weekday.format(asDate(d))}</span>
                  <span className="mt-0.5 text-sm font-semibold">{dayMonth.format(asDate(d))}</span>
                </button>
              ))}
            </div>
            <div className="mt-6" aria-live="polite">
              {slotError ? (
                <p className="flex items-center gap-2 text-sm text-danger"><AlertCircle className="size-4" />{slotError}</p>
              ) : slots === null ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <div key={i} className="skeleton h-11 rounded-xl" />)}</div>
              ) : openSlots.length === 0 ? (
                <div className="rounded-2xl bg-surface p-8 text-center">
                  <p className="font-medium text-ink">No available slots on this day</p>
                  <p className="mt-1 text-sm text-muted">Try another date — availability updates in real time.</p>
                </div>
              ) : (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Time">
                  {openSlots.map((s) => (
                    <li key={s.time}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedTime === s.time}
                        onClick={() => setTime(s.time)}
                        className={cn(
                          "w-full rounded-xl border py-2.5 text-sm font-medium transition",
                          selectedTime === s.time ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary/40",
                        )}
                      >
                        {s.time}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="s2">
            <h2 id="s2" className="text-3xl">Where should we meet?</h2>
            {modes.length === 0 ? (
              <p className="mt-4 text-sm text-danger">This service isn&apos;t available for booking right now.</p>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Service location">
                {modes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border bg-surface p-5 text-left transition",
                      mode === m ? "border-primary ring-4 ring-primary/8" : "border-line hover:border-primary/30",
                    )}
                  >
                    {m === "HOME" ? <Home className="mt-0.5 size-5 text-rose-deep" aria-hidden="true" /> : <Store className="mt-0.5 size-5 text-rose-deep" aria-hidden="true" />}
                    <span>
                      <span className="block font-medium text-ink">{m === "HOME" ? "At my place" : provider.type === "SALON" ? "At the salon" : "At the studio"}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {m === "HOME" ? (service?.homeServiceFee ? `+${formatPaise(service.homeServiceFee)} travel fee` : "No extra travel fee") : (provider.address ?? `${provider.city}`)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {mode === "HOME" && (
              <div className="mt-8 space-y-4">
                {addresses.length > 0 && (
                  <div className="space-y-2" role="radiogroup" aria-label="Saved addresses">
                    {addresses.map((a) => (
                      <label key={a.id} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border bg-surface p-4", addressId === a.id ? "border-primary" : "border-line")}>
                        <input type="radio" name="addr" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1 accent-[var(--color-primary)]" />
                        <span className="text-sm"><span className="font-medium">{a.label}</span><span className="block text-muted">{[a.line1, a.line2, a.city, a.pincode].filter(Boolean).join(", ")}</span></span>
                      </label>
                    ))}
                    <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border bg-surface p-4 text-sm", addressId === "new" ? "border-primary" : "border-line")}>
                      <input type="radio" name="addr" checked={addressId === "new"} onChange={() => setAddressId("new")} className="accent-[var(--color-primary)]" />
                      Use a new address
                    </label>
                  </div>
                )}
                {addressId === "new" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="line1" label="House / flat, street" error={addressErrors.line1} required className="sm:col-span-2">
                      <Input autoComplete="address-line1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
                    </Field>
                    <Field id="line2" label="Area / locality" className="sm:col-span-2">
                      <Input autoComplete="address-line2" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
                    </Field>
                    <Field id="landmark" label="Landmark">
                      <Input value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })} />
                    </Field>
                    <Field id="pincode" label="Pincode" error={addressErrors.pincode}>
                      <Input inputMode="numeric" autoComplete="postal-code" maxLength={6} value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} />
                    </Field>
                    <Field id="city" label="City" error={addressErrors.city} required hint={`Home service is available in ${provider.city}`}>
                      <Input autoComplete="address-level2" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                    </Field>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {step === 3 && service && (
          <section aria-labelledby="s3" className="space-y-6">
            <h2 id="s3" className="text-3xl">Review & confirm</h2>
            <Field id="note" label="Anything the artist should know?" hint="Skin type, outfit colour, references, allergies…">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
            </Field>
            <Field id="offer" label="Offer code">
              <Input value={offerCode} onChange={(e) => setOfferCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME15" autoCapitalize="characters" />
            </Field>
            <fieldset>
              <legend className="mb-3 text-sm font-medium text-ink">Payment</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {paymentsEnabled && (
                  <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border bg-surface p-4", payment === "ONLINE" ? "border-primary ring-4 ring-primary/8" : "border-line")}>
                    <input type="radio" name="pay" className="sr-only" checked={payment === "ONLINE"} onChange={() => setPayment("ONLINE")} />
                    <CreditCard className="mt-0.5 size-5 text-rose-deep" aria-hidden="true" />
                    <span className="text-sm"><span className="block font-medium">Pay now</span><span className="text-muted">UPI, cards, netbanking — instant confirmation</span></span>
                  </label>
                )}
                <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border bg-surface p-4", payment === "PAY_AT_VENUE" ? "border-primary ring-4 ring-primary/8" : "border-line")}>
                  <input type="radio" name="pay" className="sr-only" checked={payment === "PAY_AT_VENUE"} onChange={() => setPayment("PAY_AT_VENUE")} />
                  <Wallet className="mt-0.5 size-5 text-rose-deep" aria-hidden="true" />
                  <span className="text-sm"><span className="block font-medium">Pay after service</span><span className="text-muted">Confirmed once the professional accepts</span></span>
                </label>
              </div>
            </fieldset>
            {submitError && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {submitError}
              </p>
            )}
          </section>
        )}

        {/* Nav */}
        <div className="mt-10 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ChevronLeft aria-hidden="true" /> Back
            </Button>
          ) : <span />}
          {step < STEPS.length - 1 ? (
            <Button size="lg" onClick={next} disabled={!canContinue}>
              Continue
            </Button>
          ) : (
            <Button size="lg" onClick={confirm} loading={submitting}>
              {payment === "ONLINE" ? `Pay ${formatPaise(total)}` : "Request booking"}
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <aside aria-label="Booking summary" className="order-first lg:order-none">
        <div className="rounded-3xl bg-surface p-6 shadow-card lg:sticky lg:top-28">
          <div className="flex items-center gap-3">
            <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft font-semibold text-primary">
              {provider.avatar ? <Image src={provider.avatar} alt="" fill sizes="48px" className="object-cover" /> : initials(provider.name)}
            </span>
            <div>
              <p className="font-semibold text-ink">{provider.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="size-3.5" aria-hidden="true" />{provider.city}</p>
            </div>
          </div>
          <dl className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Service</dt><dd className="text-right font-medium">{service?.name ?? "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">When</dt><dd className="text-right font-medium">{selectedTime ? `${dayMonth.format(asDate(date))}, ${selectedTime}` : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Where</dt><dd className="text-right font-medium">{step >= 2 ? (mode === "HOME" ? "Your place" : provider.type === "SALON" ? "Salon" : "Studio") : "—"}</dd></div>
          </dl>
          <dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Service price</dt><dd>{service ? formatPaise(service.price) : "—"}</dd></div>
            {homeFee > 0 && <div className="flex justify-between"><dt className="text-muted">Home service fee</dt><dd>{formatPaise(homeFee)}</dd></div>}
            {offerCode && <div className="flex justify-between text-success"><dt className="inline-flex items-center gap-1"><Tag className="size-3.5" aria-hidden="true" />{offerCode}</dt><dd>Applied at checkout</dd></div>}
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{service ? formatPaise(total) : "—"}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-muted">Free cancellation up to 24 hours before your appointment.</p>
        </div>
      </aside>
    </div>
  );
}

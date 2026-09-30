"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { CITIES } from "@/lib/catalog";
import { savedAddressSchema, updateProfileSchema } from "@/lib/validation/account";
import { changePasswordSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { applyServerErrors } from "@/components/auth/auth-forms";
import { EmptyState } from "@/components/feedback/states";

type Profile = {
  name: string;
  email: string | null;
  phone: string | null;
  defaultCity: string | null;
  notificationPrefs: { email: boolean; marketing: boolean };
  hasPassword: boolean;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const form = useForm<z.input<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: profile.name,
      phone: profile.phone?.replace(/^\+91/, "") ?? "",
      defaultCity: profile.defaultCity ?? "",
      notificationPrefs: profile.notificationPrefs,
    },
  });
  const { errors, isSubmitting, isDirty } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await api.patch("/me", v);
      toast.success("Profile updated");
      form.reset(v);
      router.refresh();
    } catch (e) {
      applyServerErrors(e, form.setError, ["name", "phone"]);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-5 rounded-3xl bg-surface p-6 shadow-card sm:p-8">
      <Field id="name" label="Full name" error={errors.name?.message}>
        <Input autoComplete="name" {...form.register("name")} />
      </Field>
      <Field id="email" label="Email" hint="Contact support to change your email">
        <Input value={profile.email ?? ""} disabled readOnly />
      </Field>
      <Field id="phone" label="Mobile number" error={errors.phone?.message}>
        <Input type="tel" inputMode="tel" autoComplete="tel" {...form.register("phone")} />
      </Field>
      <Field id="city" label="Default city">
        <NativeSelect {...form.register("defaultCity")}>
          <option value="">Not set</option>
          {CITIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
        </NativeSelect>
      </Field>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">Email me about</legend>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-[var(--color-primary)]" {...form.register("notificationPrefs.email")} /> Booking confirmations & reminders</label>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-[var(--color-primary)]" {...form.register("notificationPrefs.marketing")} /> Offers and new artists near me</label>
      </fieldset>
      <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save changes</Button>
    </form>
  );
}

type Address = { id: string; label: string; line1: string; line2?: string; landmark?: string; city: string; pincode?: string; isDefault: boolean };

export function AddressManager({ initial }: { initial: Address[] }) {
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(initial.length === 0);
  const form = useForm<z.input<typeof savedAddressSchema>>({ resolver: zodResolver(savedAddressSchema), defaultValues: { label: "Home", line1: "", city: "" } });
  const { errors, isSubmitting } = form.formState;
  const add = form.handleSubmit(async (v) => {
    try {
      const { data } = await api.post<Address[]>("/me/addresses", v);
      setItems(data);
      setAdding(false);
      form.reset({ label: "Home", line1: "", city: "" });
      toast.success("Address saved");
    } catch (e) {
      applyServerErrors(e, form.setError, ["line1", "city", "pincode", "label"]);
    }
  });
  const remove = async (id: string) => {
    try {
      const { data } = await api.del<Address[]>(`/me/addresses/${id}`);
      setItems(data);
      toast.success("Address removed");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't remove address");
    }
  };
  return (
    <div className="max-w-2xl space-y-4">
      {items.length === 0 && !adding && <EmptyState icon={MapPin} title="No saved addresses" description="Save your home or office for faster home-service bookings." />}
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-4 rounded-2xl bg-surface p-5">
            <div className="text-sm">
              <p className="font-semibold text-ink">{a.label} {a.isDefault && <span className="ml-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary">Default</span>}</p>
              <p className="mt-1 text-muted">{[a.line1, a.line2, a.landmark, a.city, a.pincode].filter(Boolean).join(", ")}</p>
            </div>
            <button type="button" onClick={() => remove(a.id)} className="grid size-9 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger" aria-label={`Delete ${a.label} address`}>
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      {adding ? (
        <form onSubmit={add} noValidate className="grid gap-4 rounded-3xl bg-surface p-6 shadow-card sm:grid-cols-2">
          <Field id="label" label="Label" error={errors.label?.message}><Input placeholder="Home, Office…" {...form.register("label")} /></Field>
          <Field id="city" label="City" error={errors.city?.message} required><Input autoComplete="address-level2" {...form.register("city")} /></Field>
          <Field id="line1" label="House / flat, street" error={errors.line1?.message} required className="sm:col-span-2"><Input autoComplete="address-line1" {...form.register("line1")} /></Field>
          <Field id="line2" label="Area / locality" className="sm:col-span-2"><Input autoComplete="address-line2" {...form.register("line2")} /></Field>
          <Field id="landmark" label="Landmark"><Input {...form.register("landmark")} /></Field>
          <Field id="pincode" label="Pincode" error={errors.pincode?.message}><Input inputMode="numeric" maxLength={6} autoComplete="postal-code" {...form.register("pincode")} /></Field>
          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit" loading={isSubmitting}>Save address</Button>
            {items.length > 0 && <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>}
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>Add an address</Button>
      )}
    </div>
  );
}

export function SecurityPanel({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const form = useForm<z.input<typeof changePasswordSchema>>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "" } });
  const { errors, isSubmitting } = form.formState;
  const [signingOut, setSigningOut] = useState(false);
  const change = form.handleSubmit(async (v) => {
    try {
      await api.post("/auth/password", v);
      toast.success("Password updated");
      form.reset();
    } catch (e) {
      applyServerErrors(e, form.setError, ["currentPassword", "newPassword"]);
    }
  });
  const signOutAll = async () => {
    setSigningOut(true);
    try {
      await api.del("/auth/sessions");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Couldn't sign out other devices");
      setSigningOut(false);
    }
  };
  return (
    <div className="max-w-xl space-y-6">
      <form onSubmit={change} noValidate className="space-y-5 rounded-3xl bg-surface p-6 shadow-card sm:p-8">
        <h2 className="text-2xl">{hasPassword ? "Change password" : "Set a password"}</h2>
        {hasPassword && (
          <Field id="currentPassword" label="Current password" error={errors.currentPassword?.message}>
            <Input type="password" autoComplete="current-password" {...form.register("currentPassword")} />
          </Field>
        )}
        <Field id="newPassword" label="New password" error={errors.newPassword?.message} hint="At least 8 characters, with a letter and a number">
          <Input type="password" autoComplete="new-password" {...form.register("newPassword")} />
        </Field>
        <Button type="submit" loading={isSubmitting}>Update password</Button>
      </form>
      <div className="rounded-3xl bg-surface p-6 shadow-card sm:p-8">
        <h2 className="text-2xl">Signed-in devices</h2>
        <p className="mt-2 text-sm text-muted">Signs you out everywhere, including this device. Use this if you lost a phone or signed in on a shared computer.</p>
        <Button variant="secondary" className="mt-5" onClick={signOutAll} loading={signingOut}>Sign out of all devices</Button>
      </div>
    </div>
  );
}

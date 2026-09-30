"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Phone, Store, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { indianPhone } from "@/lib/validation/common";
import { safeNextPath } from "@/lib/safe-redirect";
import type { Role } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

type AuthResult = { user: { id: string; name: string; role: Role } };

function homeFor(role: Role, next: string | null) {
  if (next && next !== "/") return safeNextPath(next);
  if (role === "ADMIN") return "/admin";
  if (role === "ARTIST" || role === "SALON") return "/partner";
  return "/";
}

export function applyServerErrors<F extends string>(e: unknown, setError: (name: F, err: { message: string }) => void, fields: F[]) {
  if (e instanceof ApiError && e.details) {
    let any = false;
    for (const f of fields) {
      const msg = e.fieldError(f);
      if (msg) {
        setError(f, { message: msg });
        any = true;
      }
    }
    if (any) return;
  }
  toast.error(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
}

function GoogleButton({ next }: { next: string | null }) {
  return (
    <Button asChild variant="secondary" className="w-full">
      <a href={`/api/v1/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
        </svg>
        Continue with Google
      </a>
    </Button>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/* ── Login ───────────────────────────────────────────────── */
export function LoginForm({ next, googleEnabled, phoneEnabled, oauthError }: { next: string | null; googleEnabled: boolean; phoneEnabled: boolean; oauthError?: string | null }) {
  const [mode, setMode] = useState<"email" | "phone">("email");
  return (
    <div>
      <h1 className="text-5xl">Welcome back</h1>
      <p className="mt-2 text-muted">Sign in to book, save looks and manage your appointments.</p>
      {oauthError && <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">Google sign-in didn&apos;t complete. Please try again.</p>}
      <div className="mt-8 space-y-3">
        {googleEnabled && <GoogleButton next={next} />}
        {phoneEnabled && (
          <Button variant="secondary" className="w-full" onClick={() => setMode(mode === "email" ? "phone" : "email")}>
            {mode === "email" ? <Phone aria-hidden="true" /> : <Mail aria-hidden="true" />}
            {mode === "email" ? "Use phone number" : "Use email instead"}
          </Button>
        )}
      </div>
      {(googleEnabled || phoneEnabled) && <Divider />}
      {mode === "email" ? <EmailLogin next={next} /> : <PhoneLogin next={next} />}
      <p className="mt-8 text-center text-sm text-muted">
        New to Rivya?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

function EmailLogin({ next }: { next: string | null }) {
  const router = useRouter();
  const form = useForm<z.input<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { data } = await api.post<AuthResult>("/auth/login", values);
      router.replace(homeFor(data.user.role, next));
      router.refresh();
    } catch (e) {
      applyServerErrors(e, form.setError, ["email", "password"]);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="email" label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field id="password" label="Password" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...form.register("password")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}

function PhoneLogin({ next }: { next: string | null }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async () => {
    const parsed = indianPhone.safeParse(phone);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Enter a valid number");
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/otp/request", { phone });
      setSent(true);
      toast.success("We've sent you a 6-digit code");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't send the code");
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<AuthResult>("/auth/otp/verify", { phone, code });
      router.replace(homeFor(data.user.role, next));
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't verify the code");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <Field id="phone" label="Mobile number" error={!sent ? (error ?? undefined) : undefined} hint="We'll text you a one-time code">
        <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={sent} />
      </Field>
      {sent && (
        <Field id="otp" label="6-digit code" error={error ?? undefined}>
          <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
        </Field>
      )}
      <Button size="lg" className="w-full" loading={busy} onClick={sent ? verify : request}>
        {sent ? "Verify & continue" : "Send code"}
      </Button>
    </div>
  );
}

/* ── Register ────────────────────────────────────────────── */
const ACCOUNT_TYPES = [
  { value: "CUSTOMER", label: "I'm booking", icon: User, blurb: "Discover & book professionals" },
  { value: "ARTIST", label: "I'm an artist", icon: Sparkles, blurb: "Freelance or independent pro" },
  { value: "SALON", label: "I own a salon", icon: Store, blurb: "List your business & team" },
] as const;

export function RegisterForm({ next, initialType, googleEnabled }: { next: string | null; initialType: "CUSTOMER" | "ARTIST" | "SALON"; googleEnabled: boolean }) {
  const router = useRouter();
  const form = useForm<z.input<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", phone: undefined, accountType: initialType },
  });
  const { errors, isSubmitting } = form.formState;
  const accountType = useWatch({ control: form.control, name: "accountType" });
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { data } = await api.post<AuthResult>("/auth/register", { ...values, phone: values.phone || undefined });
      toast.success(`Welcome to Rivya, ${data.user.name.split(" ")[0]}!`);
      router.replace(data.user.role === "CUSTOMER" ? homeFor("CUSTOMER", next) : "/partner/onboarding");
      router.refresh();
    } catch (e) {
      applyServerErrors(e, form.setError, ["name", "email", "password", "phone"]);
    }
  });
  const partner = accountType !== "CUSTOMER";
  return (
    <div>
      <h1 className="text-5xl">{partner ? "Grow with Rivya" : "Create your account"}</h1>
      <p className="mt-2 text-muted">{partner ? "Set up your partner account — your profile comes next." : "Save looks, book trusted artists and keep every appointment in one place."}</p>

      <fieldset className="mt-8">
        <legend className="sr-only">Account type</legend>
        <div className="grid grid-cols-3 gap-2">
          {ACCOUNT_TYPES.map(({ value, label, icon: Icon }) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border p-3 text-center text-xs font-medium transition has-focus-visible:outline-2 has-focus-visible:outline-primary",
                accountType === value ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-ink hover:border-primary/30",
              )}
            >
              <input type="radio" value={value} className="sr-only" {...form.register("accountType")} />
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {googleEnabled && !partner && (
        <>
          <div className="mt-6"><GoogleButton next={next} /></div>
          <Divider />
        </>
      )}

      <form onSubmit={onSubmit} noValidate className={cn("space-y-4", !(googleEnabled && !partner) && "mt-6")}>
        <Field id="name" label={accountType === "SALON" ? "Your name (owner)" : "Full name"} error={errors.name?.message} required>
          <Input autoComplete="name" {...form.register("name")} />
        </Field>
        <Field id="email" label="Email" error={errors.email?.message} required>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field id="phone" label="Mobile number" error={errors.phone?.message} hint={partner ? "Clients and Rivya support will use this" : "Optional — for booking updates"} required={partner}>
          <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" {...form.register("phone", { setValueAs: (v) => (v === "" ? undefined : v) })} />
        </Field>
        <Field id="password" label="Password" error={errors.password?.message} hint="At least 8 characters, with a letter and a number" required>
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {partner ? "Continue to profile setup" : "Create account"}
        </Button>
        <p className="text-center text-xs text-muted">
          By continuing you agree to Rivya&apos;s <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

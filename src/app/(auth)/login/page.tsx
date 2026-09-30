import type { Metadata } from "next";
import { integrations } from "@/lib/config/env";
import { getOtpSender } from "@/server/auth/otp";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : null;
  return (
    <LoginForm
      next={next}
      googleEnabled={integrations.google()}
      phoneEnabled={getOtpSender() !== null}
      oauthError={typeof sp.error === "string" ? sp.error : null}
    />
  );
}

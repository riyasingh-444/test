import type { Metadata } from "next";
import { integrations } from "@/lib/config/env";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const sp = await searchParams;
  const type = sp.type === "artist" ? "ARTIST" : sp.type === "salon" ? "SALON" : "CUSTOMER";
  return <RegisterForm next={typeof sp.next === "string" ? sp.next : null} initialType={type} googleEnabled={integrations.google()} />;
}

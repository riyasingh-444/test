import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { accountService } from "@/server/services/account.service";
import { SecurityPanel } from "@/components/account/account-forms";

export const metadata: Metadata = { title: "Security", robots: { index: false } };

export default async function SecurityPage() {
  const user = await requireUser();
  const profile = await accountService.getProfile(user.id);
  return (
    <div>
      <h1 className="mb-6 text-4xl md:text-5xl">Security</h1>
      <SecurityPanel hasPassword={profile.hasPassword} />
    </div>
  );
}

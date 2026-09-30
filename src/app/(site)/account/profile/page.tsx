import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { accountService } from "@/server/services/account.service";
import { ProfileForm } from "@/components/account/account-forms";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await accountService.getProfile(user.id);
  return (
    <div>
      <h1 className="mb-6 text-4xl md:text-5xl">Profile</h1>
      <ProfileForm profile={profile} />
    </div>
  );
}

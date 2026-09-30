import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { accountService } from "@/server/services/account.service";
import { AddressManager } from "@/components/account/account-forms";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await accountService.listAddresses(user.id);
  return (
    <div>
      <h1 className="mb-2 text-4xl md:text-5xl">Addresses</h1>
      <p className="mb-6 text-muted">Used for home-service bookings.</p>
      <AddressManager initial={addresses} />
    </div>
  );
}

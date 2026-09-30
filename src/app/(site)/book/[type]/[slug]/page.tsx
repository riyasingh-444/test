import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { integrations } from "@/lib/config/env";
import { connectDB } from "@/server/db/connection";
import { getCurrentUser } from "@/server/auth/current-user";
import { AppError } from "@/server/http/errors";
import { User } from "@/server/models";
import { discoveryService } from "@/server/services/discovery.service";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { EmptyState } from "@/components/feedback/states";

export const metadata: Metadata = { title: "Book an appointment", robots: { index: false } };

export default async function BookPage({ params, searchParams }: PageProps<"/book/[type]/[slug]">) {
  const { type, slug } = await params;
  const sp = await searchParams;
  if (type !== "artists" && type !== "salons") notFound();

  await connectDB();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/book/${type}/${slug}`)}`);

  let profile;
  try {
    profile = type === "artists" ? await discoveryService.getArtistProfile(slug) : await discoveryService.getSalonProfile(slug);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const [services, me] = await Promise.all([
    discoveryService.listServices(profile.type, profile.id),
    User.findById(user.id).select("addresses").lean(),
  ]);

  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const backHref = `/${type}/${profile.slug}`;

  return (
    <div className="container-page pt-6 md:pt-10">
      <Link href={backHref} className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ChevronLeft className="size-4" aria-hidden="true" /> Back to {profile.name}
      </Link>
      <h1 className="mb-8 text-4xl md:text-5xl">Book with {profile.name}</h1>
      {services.length === 0 ? (
        <EmptyState title="No bookable services yet" description="This professional hasn't published services. Check back soon." action={{ label: "Back to profile", href: backHref }} />
      ) : (
        <BookingWizard
          provider={{
            id: profile.id,
            type: profile.type,
            slug: profile.slug,
            name: profile.name,
            avatar: profile.avatar?.url,
            city: profile.city,
            address: profile.type === "SALON" ? profile.address : profile.area ? `${profile.area}, ${profile.city}` : profile.city,
            offersHome: profile.serviceMode !== "STUDIO",
            offersStudio: profile.type === "SALON" || profile.serviceMode !== "HOME",
          }}
          services={services}
          addresses={(me?.addresses ?? []).map((a) => ({
            id: String(a._id),
            label: a.label ?? "Address",
            line1: a.line1,
            line2: a.line2 ?? undefined,
            landmark: a.landmark ?? undefined,
            city: a.city,
            pincode: a.pincode ?? undefined,
          }))}
          paymentsEnabled={integrations.razorpay()}
          initial={{ serviceId: str(sp.service), date: str(sp.date), time: str(sp.time) }}
        />
      )}
    </div>
  );
}

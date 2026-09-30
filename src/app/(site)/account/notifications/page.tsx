import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { load } from "@/server/page-context";
import { notificationService } from "@/server/notifications";
import { NotificationsList } from "@/components/account/notifications-list";
import { ErrorState } from "@/components/feedback/states";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage({ searchParams }: PageProps<"/account/notifications">) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const user = await requireUser();
  const res = await load(() => notificationService.list(user.id, page, 20));
  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl md:text-5xl">Notifications</h1>
      <div className="mt-6">
        {res.ok ? (
          <>
            <NotificationsList items={res.data.items} unread={res.data.unread} />
            <Pagination page={page} total={res.data.total} limit={20} basePath="/account/notifications" searchParams={sp} />
          </>
        ) : <ErrorState description={res.error} />}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { NotificationDTO } from "@/types/dto";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/states";

const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function NotificationsList({ items, unread }: { items: NotificationDTO[]; unread: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const markAll = async () => {
    setBusy(true);
    try {
      await api.patch("/notifications", { ids: "all" });
      router.refresh();
    } catch {
      toast.error("Couldn't update notifications");
    } finally {
      setBusy(false);
    }
  };
  const open = (n: NotificationDTO) => {
    if (!n.readAt) void api.patch("/notifications", { ids: [n.id] }).catch(() => undefined);
  };
  if (items.length === 0) return <EmptyState icon={Bell} title="You're all caught up" description="Booking updates, reminders and offers will appear here." />;
  return (
    <div>
      {unread > 0 && (
        <div className="mb-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={markAll} loading={busy}>Mark all as read</Button>
        </div>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
        {items.map((n) => {
          const body = (
            <div className="flex gap-3 p-4">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-rose")} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", n.readAt ? "text-ink" : "font-semibold text-ink")}>{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                <p className="mt-1 text-xs text-subtle">{fmt.format(new Date(n.createdAt))}</p>
              </div>
              {!n.readAt && <span className="sr-only">Unread</span>}
            </div>
          );
          return (
            <li key={n.id}>
              {n.link ? <Link href={n.link} onClick={() => open(n)} className="block hover:bg-blush">{body}</Link> : body}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

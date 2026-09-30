"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

const overlay =
  "fixed inset-0 z-50 bg-[#2c0a18]/40 backdrop-blur-[2px]  data-[state=open]:animate-fade-in";

export function DialogContent({
  className,
  children,
  title,
  description,
  hideTitle = false,
  ...props
}: React.ComponentProps<typeof D.Content> & { title: string; description?: string; hideTitle?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <D.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
          "rounded-2xl bg-surface p-6 shadow-float focus:outline-none data-[state=open]:animate-rise",
          className,
        )}
        {...props}
      >
        <D.Title className={cn("pr-8 font-serif text-2xl text-primary", hideTitle && "sr-only")}>{title}</D.Title>
        {description ? (
          <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>
        ) : (
          <D.Description className="sr-only">{title}</D.Description>
        )}
        <div className={cn(!hideTitle && "mt-5")}>{children}</div>
        <D.Close
          className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
          aria-label="Close"
        >
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

/** Mobile-first sheet. Slides from the bottom on small screens, the side on large. */
export function SheetContent({
  className,
  children,
  title,
  side = "bottom",
  ...props
}: React.ComponentProps<typeof D.Content> & { title: string; side?: "bottom" | "right" | "left" }) {
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <D.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface shadow-float focus:outline-none",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-sheet-up",
          side === "right" && "inset-y-0 right-0 w-full max-w-md data-[state=open]:animate-sheet-left",
          side === "left" && "inset-y-0 left-0 w-full max-w-xs",
          className,
        )}
        {...props}
      >
        {side === "bottom" && <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-line-strong" aria-hidden="true" />}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <D.Title className="font-serif text-2xl text-primary">{title}</D.Title>
          <D.Description className="sr-only">{title}</D.Description>
          <D.Close
            className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
            aria-label="Close"
          >
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

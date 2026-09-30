import Link from "next/link";
import { MoonMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container-page grid min-h-[70vh] place-items-center py-24 text-center">
      <div>
        <MoonMark className="mx-auto size-14" />
        <h1 className="mt-6 text-5xl">This page slipped away</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild><Link href="/">Go home</Link></Button>
          <Button asChild variant="secondary"><Link href="/explore">Explore artists</Link></Button>
        </div>
      </div>
    </main>
  );
}

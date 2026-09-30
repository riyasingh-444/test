import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { MARKETING } from "@/lib/marketing";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <Image src={MARKETING.heroMain.url} alt="" fill priority sizes="50vw" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="max-w-md font-serif text-4xl leading-tight text-white">“Your beauty, your way — booked with people you can trust.”</p>
          <p className="mt-4 text-sm text-white/75">Portfolios, prices and verified reviews for every professional.</p>
        </div>
      </div>
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" className="self-start" aria-label="Rivya home">
          <Logo />
        </Link>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</main>
      </div>
    </div>
  );
}

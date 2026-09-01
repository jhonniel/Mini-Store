import Link from "next/link";
import { Boxes, ShieldCheck, Store, Wallet } from "lucide-react";
import { brand } from "@/config/brand";
import { FloatingSnacks } from "@/components/auth/floating-snacks";

const highlights = [
  { icon: Boxes, text: "Live inventory and low-stock alerts" },
  { icon: Wallet, text: "Pay now, partial, or pay later" },
  { icon: ShieldCheck, text: "One login — your role decides what you can do" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#12382b] p-10 text-white lg:flex">
        <FloatingSnacks />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,32,24,0.12)_0%,rgba(18,56,43,0.08)_50%,rgba(10,32,24,0.22)_100%)]" />
        <Link href="/" className="relative z-10 flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#7ddea8] text-[#12382b]">
            <Store className="size-5" />
          </span>
          {brand.name}
        </Link>
        <div className="relative z-10 max-w-md space-y-8 [text-shadow:0_2px_14px_rgba(0,0,0,0.55)]">
          <div className="space-y-3">
            <p className="text-3xl font-semibold tracking-tight text-balance">{brand.tagline}</p>
            <p className="text-sm leading-6 text-white/75">
              Products, stock, sales, and customer balances in one place for grocery and general goods stores.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-white/85">
            {highlights.map((item) => (
              <li key={item.text} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <item.icon className="size-4" />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#12382b] px-5 py-8 sm:px-8 lg:px-10">
        <div className="lg:hidden">
          <FloatingSnacks />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,32,24,0.12)_0%,rgba(18,56,43,0.08)_50%,rgba(10,32,24,0.22)_100%)]" />
        </div>
        <Link href="/" className="relative z-10 mb-6 flex items-center gap-2 font-semibold text-white lg:hidden">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#7ddea8] text-[#12382b]">
            <Store className="size-5" />
          </span>
          {brand.name}
        </Link>
        <div className="relative z-10 w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}

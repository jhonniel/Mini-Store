import Link from "next/link";
import { Boxes, ShieldCheck, Store, Wallet } from "lucide-react";
import { brand } from "@/config/brand";

const highlights = [
  { icon: Boxes, text: "Live inventory and low-stock alerts" },
  { icon: Wallet, text: "Pay now, partial, or pay later" },
  { icon: ShieldCheck, text: "One login — your role decides what you can do" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#12382b] p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(110,190,140,0.22),transparent_42%)]" />
        <Link href="/" className="relative flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/10">
            <Store className="size-5" />
          </span>
          {brand.name}
        </Link>
        <div className="relative max-w-md space-y-8">
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
      <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-8">
        <Link href="/" className="mb-8 flex items-center gap-2 font-semibold lg:hidden">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Store className="size-5" />
          </span>
          {brand.name}
        </Link>
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const authInputClass =
  "h-12 w-full min-w-0 rounded-xl border border-white/10 bg-[#252b32] px-3.5 text-base text-white placeholder:text-white/35 outline-none transition-colors focus-visible:border-[#7ddea8]/70 focus-visible:ring-3 focus-visible:ring-[#7ddea8]/25";

export const authButtonClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#7ddea8] text-sm font-semibold text-[#12382b] transition-colors hover:bg-[#8eebc0] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4";

export const authErrorClass =
  "mb-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200";

export const authLabelClass = "text-sm font-medium text-white";

export function AuthInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(authInputClass, className)} {...props} />;
}

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] bg-[#141816]/92 p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-8">
      <div className="mb-7 space-y-2">
        <h1 className="text-[1.75rem] font-semibold tracking-tight">{title}</h1>
        <p className="text-sm leading-6 text-white/55">{description}</p>
      </div>
      {children}
    </div>
  );
}

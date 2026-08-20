"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { demoAccounts } from "@/config/demo";
import { getAuthErrorMessage } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/auth-card";

function safeNext(next: string) {
  if (next === "/" || next.startsWith("/store/")) return next;
  if (next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") && !next.startsWith("/api")) {
    return next;
  }
  return "/";
}

export function LoginForm({ next, error }: { next: string; error?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState(error ?? "");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setPending(true);
    try {
      const supabase = createClient();
      const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
      if (signError) {
        setFormError(getAuthErrorMessage(signError, signError.message));
        return;
      }
      router.replace(safeNext(next));
      router.refresh();
    } catch (err) {
      setFormError(getAuthErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Sign in"
      description="Use the same account for shopping and managing the store. Your role controls what you see."
    >
      {formError ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <Button type="submit" className="h-10 w-full" size="lg" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Sign in
        </Button>
      </form>
      <div className="mt-6 rounded-xl border bg-muted/40 p-3 text-sm">
        <p className="mb-2 font-medium">Demo accounts</p>
        <p className="mb-3 text-xs text-muted-foreground">
          After you run <code className="rounded bg-background px-1">select * from public.seed_demo_accounts();</code> in
          the Supabase SQL editor:
        </p>
        <div className="space-y-2">
          {(
            [
              ["Admin", demoAccounts.admin],
              ["User", demoAccounts.user],
            ] as const
          ).map(([label, account]) => (
            <div key={account.email} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {account.email} / {account.password}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                  setFormError("");
                }}
              >
                Use
              </Button>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}

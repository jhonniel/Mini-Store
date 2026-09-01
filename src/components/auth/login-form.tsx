"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { AuthCard, AuthInput, authButtonClass, authErrorClass } from "@/components/auth/auth-card";
import { resolveAppHome } from "@/lib/auth/home-path";

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
      const { data, error: signError } = await supabase.auth.signInWithPassword({ email, password });
      if (signError) {
        setFormError(getAuthErrorMessage(signError, signError.message));
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        await supabase.auth.signOut();
        setFormError("No account found for that email.");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
      if (!profile) {
        await supabase.auth.signOut();
        setFormError("This account is not in the store database. Ask an admin to add you first.");
        return;
      }

      const home = await resolveAppHome(supabase, userId, next);
      router.replace(home);
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
      description="Use the email and password for an account that already exists in the store."
    >
      {formError ? <p className={authErrorClass}>{formError}</p> : null}
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-white">
            Email
          </Label>
          <AuthInput
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password" className="text-white">
              Password
            </Label>
            <Link href="/forgot-password" className="text-xs font-medium text-[#7ddea8] hover:underline">
              Forgot password?
            </Link>
          </div>
          <AuthInput
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className={authButtonClass} disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Sign in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-white/55">
        New here?{" "}
        <Link href="/register" className="font-medium text-[#7ddea8] hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}

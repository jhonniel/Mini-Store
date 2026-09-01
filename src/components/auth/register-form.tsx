"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { AuthInput, authButtonClass, authErrorClass, authLabelClass } from "@/components/auth/auth-card";
import { resolveAppHome } from "@/lib/auth/home-path";

export function RegisterForm({ slug, invite }: { slug?: string; invite?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setFormError("");
    setPending(true);
    try {
      const supabase = createClient();
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) {
        setFormError(getAuthErrorMessage(error, error.message));
        return;
      }
      const user = data.user;
      if (invite) {
        await supabase.rpc("accept_invite", { p_token: invite });
      } else if (slug) {
        await supabase.rpc("join_store_as_customer", { p_slug: slug });
      }
      if (user) {
        router.replace(await resolveAppHome(supabase, user.id, slug ? `/store/${slug}` : undefined));
        router.refresh();
        return;
      }
      router.replace(invite || slug ? "/" : "/onboarding");
      router.refresh();
    } catch (err) {
      setFormError(getAuthErrorMessage(err, "Unable to create your account."));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {formError ? <p className={authErrorClass}>{formError}</p> : null}
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="fullName" className={authLabelClass}>
            Full name
          </Label>
          <AuthInput id="fullName" name="fullName" required autoComplete="name" placeholder="Maria Santos" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email" className={authLabelClass}>
            Email
          </Label>
          <AuthInput
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password" className={authLabelClass}>
            Password
          </Label>
          <AuthInput
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </div>
        <button type="submit" className={authButtonClass} disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Create account
        </button>
      </form>
    </>
  );
}

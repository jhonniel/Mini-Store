"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      const { error } = await supabase.auth.signUp({
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
      if (invite) {
        await supabase.rpc("accept_invite", { p_token: invite });
        router.replace("/");
        router.refresh();
        return;
      }
      if (slug) {
        await supabase.rpc("join_store_as_customer", { p_slug: slug });
        router.replace("/");
        router.refresh();
        return;
      }
      router.replace("/onboarding");
      router.refresh();
    } catch (err) {
      setFormError(getAuthErrorMessage(err, "Unable to create your account."));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {formError ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" required autoComplete="name" placeholder="Maria Santos" className="h-10" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="h-10"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="h-10"
          />
        </div>
        <Button type="submit" className="h-10 w-full" size="lg" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Create account
        </Button>
      </form>
    </>
  );
}

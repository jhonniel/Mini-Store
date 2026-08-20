"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setFormError("");
    setSuccess("");
    setPending(true);
    try {
      const supabase = createClient();
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });
      if (error) {
        setFormError(getAuthErrorMessage(error, error.message));
        return;
      }
      setSuccess("Check your email for a reset link.");
    } catch (err) {
      setFormError(getAuthErrorMessage(err, "Unable to send a reset email."));
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
      {success ? (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">{success}</p>
      ) : null}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="h-10" />
        </div>
        <Button type="submit" className="h-10 w-full" size="lg" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Send reset link
        </Button>
      </form>
    </>
  );
}

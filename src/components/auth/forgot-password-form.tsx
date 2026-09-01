"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { AuthInput, authButtonClass, authErrorClass, authLabelClass } from "@/components/auth/auth-card";

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
      {formError ? <p className={authErrorClass}>{formError}</p> : null}
      {success ? (
        <p className="mb-4 rounded-xl border border-[#7ddea8]/30 bg-[#7ddea8]/10 px-3 py-2.5 text-sm text-[#7ddea8]">
          {success}
        </p>
      ) : null}
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="email" className={authLabelClass}>
            Email
          </Label>
          <AuthInput id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <button type="submit" className={authButtonClass} disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Send reset link
        </button>
      </form>
    </>
  );
}

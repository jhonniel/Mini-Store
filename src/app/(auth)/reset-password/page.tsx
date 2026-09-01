import { updatePassword } from "@/lib/actions/auth";
import { Label } from "@/components/ui/label";
import { AuthCard, AuthInput, authButtonClass, authLabelClass } from "@/components/auth/auth-card";
import { ActionForm } from "@/components/shared/action-form";

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password" description="Use at least 8 characters.">
      <ActionForm action={updatePassword} className="space-y-5">
        <div className="grid gap-2">
          <Label htmlFor="password" className={authLabelClass}>
            New password
          </Label>
          <AuthInput id="password" name="password" type="password" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmPassword" className={authLabelClass}>
            Confirm password
          </Label>
          <AuthInput id="confirmPassword" name="confirmPassword" type="password" required />
        </div>
        <button type="submit" className={authButtonClass}>
          Update password
        </button>
      </ActionForm>
    </AuthCard>
  );
}

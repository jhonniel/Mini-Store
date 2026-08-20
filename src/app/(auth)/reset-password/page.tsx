import { updatePassword } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/auth/auth-card";
import { ActionForm, SubmitButton } from "@/components/shared/action-form";

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password" description="Use at least 8 characters.">
      <ActionForm action={updatePassword} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" required className="h-10" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required className="h-10" />
        </div>
        <SubmitButton className="h-10 w-full" size="lg">
          Update password
        </SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}

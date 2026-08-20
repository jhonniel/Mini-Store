import { PageHeader } from "@/components/shared/page-header";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { inviteStaff } from "@/lib/actions/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { StaffPermissionsForm } from "@/components/staff/staff-permissions-form";
import { ActionForm } from "@/components/shared/action-form";
import type { OrganizationMember } from "@/types";

export default async function StaffPage() {
  const ctx = await requireWorkspace("staff.manage");
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("organization_members")
    .select("*, profiles(full_name, email)")
    .eq("organization_id", ctx.organization.id)
    .order("created_at");

  return (
    <div className="space-y-6">
      <PageHeader title="Staff" description="Invite teammates and configure what they can access." />
      <ActionForm action={inviteStaff} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="role">Role</Label>
          <select id="role" name="role" className="h-8 rounded-lg border bg-transparent px-2.5 text-sm">
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <SubmitButton>Create invite</SubmitButton>
      </ActionForm>
      <div className="space-y-4">
        {(members ?? []).map((member) => {
          const profile = member.profiles as { full_name: string; email: string | null } | null;
          return (
            <div key={member.id} className="rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{profile?.full_name || "Member"}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile?.email} · {member.role}
                  </p>
                </div>
              </div>
              {member.role === "staff" ? (
                <StaffPermissionsForm
                  memberId={member.id}
                  permissions={(member as OrganizationMember).permissions ?? {}}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Admins have full access.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { defaultStaffPermissions, permissionKeys, permissionLabels, type PermissionKey } from "@/config/permissions";
import { updateStaffPermissions } from "@/lib/actions/settings";
import { SubmitButton } from "@/components/shared/submit-button";
import { toast } from "sonner";

export function StaffPermissionsForm({
  memberId,
  permissions,
}: {
  memberId: string;
  permissions: Record<string, boolean>;
}) {
  const merged = { ...defaultStaffPermissions, ...permissions };
  return (
    <form
      className="grid gap-2 sm:grid-cols-2"
      action={async (formData) => {
        const next = { ...merged };
        for (const key of permissionKeys) {
          next[key] = formData.get(key) === "on";
        }
        const result = await updateStaffPermissions(memberId, next);
        if (result.error) toast.error(result.error);
        else toast.success(result.success);
      }}
    >
      {permissionKeys.map((key: PermissionKey) => (
        <label key={key} className="flex items-center gap-2 text-sm">
          <input type="checkbox" name={key} defaultChecked={merged[key]} />
          {permissionLabels[key]}
        </label>
      ))}
      <div className="sm:col-span-2">
        <SubmitButton>Save permissions</SubmitButton>
      </div>
    </form>
  );
}

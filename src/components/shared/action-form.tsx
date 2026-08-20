"use client";

import { toast } from "sonner";
import { SubmitButton } from "@/components/shared/submit-button";

type ActionResult = { error?: string; success?: string } | void;

export function ActionForm({
  action,
  children,
  className,
  successToast = true,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  successToast?: boolean;
}) {
  return (
    <form
      className={className}
      action={async (formData) => {
        const result = await action(formData);
        if (result && "error" in result && result.error) toast.error(result.error);
        if (successToast && result && "success" in result && result.success) {
          toast.success(result.success);
        }
      }}
    >
      {children}
    </form>
  );
}

export { SubmitButton };

import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/shared/submit-button";
import { upsertCustomer } from "@/lib/actions/commerce";
import { requireWorkspace } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/shared/action-form";

export default async function NewCustomerPage() {
  await requireWorkspace("customers.manage");
  async function action(formData: FormData) {
    "use server";
    const result = await upsertCustomer(formData);
    if (result.error) return result;
    redirect("/dashboard/customers");
  }
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title="Add customer" />
      <ActionForm action={action} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="fullName">Name</Label>
          <Input id="fullName" name="fullName" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" name="address" />
        </div>
        <SubmitButton>Save customer</SubmitButton>
      </ActionForm>
    </div>
  );
}

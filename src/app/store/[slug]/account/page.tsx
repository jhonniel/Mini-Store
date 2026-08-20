import { PageHeader } from "@/components/shared/page-header";
import { requireStoreCustomer } from "@/lib/auth/session";
import { updateProfile } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { PriceDisplay } from "@/components/shared/price-display";
import { ActionForm } from "@/components/shared/action-form";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function AccountPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireStoreCustomer(slug);
  const { data: customer } = await ctx.supabase
    .from("customers")
    .select("id")
    .eq("organization_id", ctx.organization.id)
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  const { data: orders } = customer
    ? await ctx.supabase.from("orders").select("total, amount_paid, balance").eq("customer_id", customer.id)
    : { data: [] };

  const outstanding = (orders ?? []).reduce((sum, o) => sum + Number(o.balance), 0);
  const purchased = (orders ?? []).reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title="Account" />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Purchased</p>
          <PriceDisplay value={purchased} currency={ctx.organization.currency} className="text-lg font-semibold" />
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <PriceDisplay value={outstanding} currency={ctx.organization.currency} className="text-lg font-semibold" />
        </div>
      </div>
      <ActionForm action={updateProfile} className="space-y-3">
        <div className="grid gap-2">
          <Label htmlFor="fullName">Name</Label>
          <Input id="fullName" name="fullName" defaultValue={ctx.profile.full_name} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={ctx.profile.phone ?? ""} />
        </div>
        <p className="text-sm text-muted-foreground">{ctx.user.email}</p>
        <SubmitButton>Save</SubmitButton>
      </ActionForm>
      <SignOutButton variant="outline" />
    </div>
  );
}

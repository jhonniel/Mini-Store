import { PageHeader } from "@/components/shared/page-header";
import { requireWorkspace } from "@/lib/auth/session";
import { updateBusinessSettings } from "@/lib/actions/settings";
import { updateProfile } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/shared/submit-button";
import { createClient } from "@/lib/supabase/server";
import { seedCatalog } from "@/lib/actions/products";
import { ActionForm } from "@/components/shared/action-form";
import { AddPaymentMethodForm } from "@/components/payments/add-payment-method-form";
import { GCashDetails } from "@/components/payments/gcash-details";
import { ImageField } from "@/components/shared/image-field";
import { paymentKind } from "@/lib/payments";
import type { PaymentMethod } from "@/types";

export default async function SettingsPage() {
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data: methods } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("sort_order");

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <PageHeader title="Settings" description="Business, inventory, orders, payments, and your account." />

      <section className="space-y-4">
        <h2 className="font-medium">Account</h2>
        <ActionForm action={updateProfile} className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Name</Label>
            <Input id="fullName" name="fullName" defaultValue={ctx.profile.full_name} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={ctx.profile.phone ?? ""} />
          </div>
          <SubmitButton>Save profile</SubmitButton>
        </ActionForm>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Business</h2>
        <ActionForm action={updateBusinessSettings} className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" name="name" defaultValue={ctx.organization.name} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={ctx.organization.email ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={ctx.organization.phone ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" defaultValue={ctx.organization.address ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" name="currency" defaultValue={ctx.organization.currency} />
          </div>
          <ImageField
            label="Logo"
            fileField="logo"
            urlField="logoUrl"
            currentUrl={ctx.organization.logo_url}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="allowPayLater" defaultChecked={ctx.settings?.allow_pay_later} />
            Allow pay later / credit
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="allowNegativeStock" defaultChecked={ctx.settings?.allow_negative_stock} />
            Allow negative stock
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="requireCustomerConfirmation" defaultChecked={ctx.settings?.require_customer_confirmation} />
            Require customer receipt confirmation
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="allowCustomerSelfCheckout" defaultChecked={ctx.settings?.allow_customer_self_checkout} />
            Allow customer self-checkout
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="lowStockNotifications" defaultChecked={ctx.settings?.low_stock_notifications} />
            Low-stock notifications
          </label>
          <div className="grid gap-2">
            <Label htmlFor="defaultMinStock">Default minimum stock</Label>
            <Input id="defaultMinStock" name="defaultMinStock" type="number" defaultValue={ctx.settings?.default_min_stock ?? 5} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paymentTermsDays">Default payment terms (days)</Label>
            <Input id="paymentTermsDays" name="paymentTermsDays" type="number" defaultValue={ctx.settings?.payment_terms_days ?? 7} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="defaultOrderStatus">Default order status</Label>
            <select id="defaultOrderStatus" name="defaultOrderStatus" className="h-8 rounded-lg border bg-transparent px-2.5 text-sm" defaultValue={ctx.settings?.default_order_status ?? "pending"}>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
            </select>
          </div>
          <SubmitButton>Save settings</SubmitButton>
        </ActionForm>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Payment methods</h2>
        <p className="text-sm text-muted-foreground">
          Add Cash for walk-in change, or GCash with your account number and QR code.
        </p>
        <ul className="space-y-3">
          {((methods ?? []) as PaymentMethod[]).map((method) => (
            <li key={method.id} className="rounded-xl border p-4 text-sm">
              <p className="font-medium">{method.name}</p>
              {paymentKind(method) === "gcash" ? <div className="mt-3"><GCashDetails method={method} /></div> : null}
              {paymentKind(method) === "cash" ? (
                <p className="mt-1 text-muted-foreground">Cashier enters cash received; change is calculated automatically.</p>
              ) : null}
            </li>
          ))}
        </ul>
        <AddPaymentMethodForm gcash={((methods ?? []) as PaymentMethod[]).find((method) => paymentKind(method) === "gcash")} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Sample catalog</h2>
        <ActionForm action={seedCatalog}>
          <SubmitButton variant="outline">Load grocery sample products</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}

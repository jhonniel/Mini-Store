import { PageHeader } from "@/components/shared/page-header";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminOrderForm } from "@/components/orders/admin-order-form";
import type { PaymentMethod } from "@/types";

export default async function NewOrderPage() {
  const ctx = await requireWorkspace("orders.process");
  const supabase = await createClient();
  const [{ data: products }, { data: customers }, { data: methods }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, selling_price, current_stock")
      .eq("organization_id", ctx.organization.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("customers")
      .select("id, full_name")
      .eq("organization_id", ctx.organization.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("full_name"),
    supabase
      .from("payment_methods")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="New sale" description="Create a walk-in or credit sale. For cash, enter the money received and the change is calculated." />
      <AdminOrderForm
        products={products ?? []}
        customers={customers ?? []}
        methods={(methods ?? []) as PaymentMethod[]}
        currency={ctx.organization.currency}
        allowPayLater={ctx.settings?.allow_pay_later ?? true}
      />
    </div>
  );
}

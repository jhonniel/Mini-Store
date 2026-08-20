import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { PriceDisplay } from "@/components/shared/price-display";
import { requireStoreCustomer } from "@/lib/auth/session";
import type { Order, OrderItem } from "@/types";

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const ctx = await requireStoreCustomer(slug);
  const { data: order } = await ctx.supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!order) notFound();

  const { data: items } = await ctx.supabase.from("order_items").select("*").eq("order_id", id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={(order as Order).order_number}
        description={new Date(order.created_at).toLocaleString()}
        actions={
          <div className="flex gap-2">
            <OrderStatusBadge status={(order as Order).status} />
            <PaymentStatusBadge status={(order as Order).payment_status} />
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <PriceDisplay value={order.total} currency={ctx.organization.currency} className="text-xl font-semibold" />
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Paid</p>
          <PriceDisplay value={order.amount_paid} currency={ctx.organization.currency} className="text-xl font-semibold" />
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Remaining</p>
          <PriceDisplay value={order.balance} currency={ctx.organization.currency} className="text-xl font-semibold" />
        </div>
      </div>
      <div className="space-y-2">
        {((items ?? []) as OrderItem[]).map((item) => (
          <div key={item.id} className="flex justify-between rounded-lg border p-3 text-sm">
            <span>
              {item.product_name} × {item.quantity}
            </span>
            <PriceDisplay value={item.subtotal} currency={ctx.organization.currency} />
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { PriceDisplay } from "@/components/shared/price-display";
import { requireStoreCustomer } from "@/lib/auth/session";
import type { Order } from "@/types";

export default async function CustomerOrdersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireStoreCustomer(slug);
  const { data: customer } = await ctx.supabase
    .from("customers")
    .select("id")
    .eq("organization_id", ctx.organization.id)
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  const { data: orders } = customer
    ? await ctx.supabase
        .from("orders")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
    : { data: [] as Order[] };

  const outstanding = (orders ?? []).reduce((sum, order) => sum + Number(order.balance), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My purchases"
        description={
          <>
            Current balance{" "}
            <PriceDisplay value={outstanding} currency={ctx.organization.currency} className="font-medium text-foreground" />
          </>
        }
      />
      {(orders ?? []).length === 0 ? (
        <EmptyState title="No orders yet." description="Your purchases will appear here." actionHref={`/store/${slug}`} actionLabel="Shop now" />
      ) : (
        <div className="space-y-3">
          {(orders as Order[]).map((order) => (
            <Link key={order.id} href={`/store/${slug}/orders/${order.id}`} className="block rounded-xl border p-4 hover:bg-muted/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{order.order_number}</p>
                <PriceDisplay value={order.total} currency={ctx.organization.currency} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.payment_status} />
                <span className="text-sm text-muted-foreground">
                  Remaining <PriceDisplay value={order.balance} currency={ctx.organization.currency} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

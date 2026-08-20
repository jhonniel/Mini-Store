import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { requireStoreCustomer } from "@/lib/auth/session";
import { ReceivedList } from "@/components/store/received-list";
import type { Order, OrderItem } from "@/types";

export default async function ReceivedPage({ params }: { params: Promise<{ slug: string }> }) {
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
        .select("*, order_items(*)")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const rows = (orders ?? []) as Array<Order & { order_items: OrderItem[] }>;

  return (
    <div className="space-y-6">
      <PageHeader title="Past purchased" description="Items you have already bought." />
      {rows.length === 0 ? (
        <EmptyState title="No past purchases yet." description="Orders you place will show up here." />
      ) : (
        <div className="space-y-6">
          {rows.map((order) => (
            <div key={order.id} className="rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-medium">{order.order_number}</p>
                <PaymentStatusBadge status={order.payment_status} />
              </div>
              <ReceivedList slug={slug} orderId={order.id} items={order.order_items ?? []} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

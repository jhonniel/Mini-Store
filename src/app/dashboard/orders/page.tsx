import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { PriceDisplay } from "@/components/shared/price-display";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/config/permissions";
import type { Order } from "@/types";

type OrderRow = Order & {
  customers?: { full_name: string } | null;
  order_items?: Array<{ profit: string }>;
};

export default async function OrdersPage() {
  const ctx = await requireWorkspace("orders.view");
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, customers(full_name), order_items(profit)")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const orders = (data ?? []) as OrderRow[];
  const showProfit = hasPermission(ctx.membership.role, ctx.membership.permissions, "finance.view");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description="Every sale, what was collected, and the profit from those products."
        actions={<Button render={<Link href="/dashboard/orders/new" />}>New sale</Button>}
      />
      {orders.length === 0 ? (
        <EmptyState title="No sales yet." description="When customers checkout or you record a sale, it will show up here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {showProfit ? <TableHead className="text-right">Profit</TableHead> : null}
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const profit = (order.order_items ?? []).reduce((sum, item) => sum + Number(item.profit), 0);
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/dashboard/orders/${order.id}`} className="font-medium hover:underline">
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell>{order.customers?.full_name ?? "—"}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <PriceDisplay value={order.total} currency={ctx.organization.currency} />
                    </TableCell>
                    {showProfit ? (
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                        <PriceDisplay value={profit} currency={ctx.organization.currency} />
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right">
                      <PriceDisplay value={order.amount_paid} currency={ctx.organization.currency} />
                    </TableCell>
                    <TableCell className="text-right">
                      <PriceDisplay value={order.balance} currency={ctx.organization.currency} />
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={order.payment_status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

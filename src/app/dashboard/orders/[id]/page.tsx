import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { PriceDisplay } from "@/components/shared/price-display";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { updateOrderStatus } from "@/lib/actions/commerce";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orderStatuses } from "@/lib/constants";
import { hasPermission } from "@/config/permissions";
import type { Order, OrderItem } from "@/types";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireWorkspace("orders.view");
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*, customers(full_name, email, phone)")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!order) notFound();

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase.from("payments").select("*").eq("order_id", id).order("created_at"),
  ]);
  const customer = order.customers as { full_name: string; email: string | null; phone: string | null } | null;
  const lineItems = (items ?? []) as OrderItem[];
  const saleProfit = lineItems.reduce((sum, item) => sum + Number(item.profit), 0);
  const showProfit = hasPermission(ctx.membership.role, ctx.membership.permissions, "finance.view");

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.order_number}
        description={`${customer?.full_name ?? "Customer"} · ${new Date(order.created_at).toLocaleString()}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <OrderStatusBadge status={(order as Order).status} />
            <PaymentStatusBadge status={(order as Order).payment_status} />
          </div>
        }
      />
      <div className={`grid gap-3 sm:grid-cols-2 ${showProfit ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-xl font-semibold">
            <PriceDisplay value={order.total} currency={ctx.organization.currency} />
          </p>
        </div>
        {showProfit ? (
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Profit</p>
            <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              <PriceDisplay value={saleProfit} currency={ctx.organization.currency} />
            </p>
          </div>
        ) : null}
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Paid</p>
          <p className="text-xl font-semibold">
            <PriceDisplay value={order.amount_paid} currency={ctx.organization.currency} />
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Remaining</p>
          <p className="text-xl font-semibold">
            <PriceDisplay value={order.balance} currency={ctx.organization.currency} />
          </p>
        </div>
      </div>
      <form className="flex flex-wrap gap-2" action={async (formData: FormData) => {
        "use server";
        await updateOrderStatus(id, String(formData.get("status")));
      }}>
        {orderStatuses.filter((s) => !["draft"].includes(s)).map((status) => (
          <Button key={status} name="status" value={status} variant="outline" size="sm">
            {status}
          </Button>
        ))}
      </form>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price at sale</TableHead>
              {showProfit ? <TableHead className="text-right">Cost at sale</TableHead> : null}
              {showProfit ? <TableHead className="text-right">Profit</TableHead> : null}
              <TableHead>Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.product_name}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  <PriceDisplay value={item.unit_price_at_sale} currency={ctx.organization.currency} />
                </TableCell>
                {showProfit ? (
                  <TableCell className="text-right">
                    <PriceDisplay value={item.unit_cost_at_sale} currency={ctx.organization.currency} />
                  </TableCell>
                ) : null}
                {showProfit ? (
                  <TableCell className="text-right text-emerald-600">
                    <PriceDisplay value={item.profit} currency={ctx.organization.currency} />
                  </TableCell>
                ) : null}
                <TableCell>
                  {item.received_at ? new Date(item.received_at).toLocaleString() : "Pending"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {(payments ?? []).length > 0 ? (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Cash received</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments ?? []).map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
                  <TableCell>{payment.payment_method}</TableCell>
                  <TableCell className="text-right">
                    <PriceDisplay value={payment.amount} currency={ctx.organization.currency} />
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.amount_tendered != null ? (
                      <PriceDisplay value={payment.amount_tendered} currency={ctx.organization.currency} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.change_due ? (
                      <PriceDisplay value={payment.change_due} currency={ctx.organization.currency} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}

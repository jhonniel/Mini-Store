import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { PriceDisplay } from "@/components/shared/price-display";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecordPaymentForm } from "@/components/payments/record-payment-form";
import type { Order, PaymentMethod } from "@/types";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireWorkspace("customers.view");
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!customer) notFound();

  const [{ data: orders }, { data: payments }, { data: methods }] = await Promise.all([
    supabase.from("orders").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("payments").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("payment_methods").select("*").eq("organization_id", ctx.organization.id).eq("is_active", true),
  ]);

  const outstanding = (orders ?? [])
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.balance), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.full_name}
        description={[customer.email, customer.phone, customer.address].filter(Boolean).join(" · ")}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-semibold">
            <PriceDisplay value={outstanding} currency={ctx.organization.currency} />
          </p>
        </div>
        <RecordPaymentForm
          customerId={customer.id}
          methods={(methods ?? []) as PaymentMethod[]}
          outstanding={outstanding}
          currency={ctx.organization.currency}
        />
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Order #</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {((orders ?? []) as Order[]).map((order) => (
              <TableRow key={order.id}>
                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{order.order_number}</TableCell>
                <TableCell className="text-right">
                  <PriceDisplay value={order.total} currency={ctx.organization.currency} />
                </TableCell>
                <TableCell className="text-right">
                  <PriceDisplay value={order.amount_paid} currency={ctx.organization.currency} />
                </TableCell>
                <TableCell className="text-right">
                  <PriceDisplay value={order.balance} currency={ctx.organization.currency} />
                </TableCell>
                <TableCell className="flex gap-2">
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={order.payment_status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div>
        <h2 className="mb-3 font-medium">Payment history</h2>
        <div className="space-y-2">
          {(payments ?? []).map((payment) => (
            <div key={payment.id} className="flex justify-between rounded-lg border p-3 text-sm">
              <span>
                {new Date(payment.created_at).toLocaleString()} · {payment.payment_method}
              </span>
              <PriceDisplay value={payment.amount} currency={ctx.organization.currency} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

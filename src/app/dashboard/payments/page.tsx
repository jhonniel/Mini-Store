import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PriceDisplay } from "@/components/shared/price-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function PaymentsPage() {
  const ctx = await requireWorkspace("payments.view");
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("*, customers(full_name), orders(order_number)")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Cash, GCash, bank transfers, and other collections." />
      {(data ?? []).length === 0 ? (
        <EmptyState title="No payments yet." description="Record a payment from a customer profile." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((payment) => {
                const customer = payment.customers as { full_name: string } | null;
                const order = payment.orders as { order_number: string } | null;
                return (
                  <TableRow key={payment.id}>
                    <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Link href={`/dashboard/customers/${payment.customer_id}`} className="hover:underline">
                        {customer?.full_name ?? "Customer"}
                      </Link>
                    </TableCell>
                    <TableCell>{order?.order_number ?? "Allocated"}</TableCell>
                    <TableCell>{payment.payment_method}</TableCell>
                    <TableCell>{payment.reference_number ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <PriceDisplay value={payment.amount} currency={ctx.organization.currency} />
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.change_due ? (
                        <PriceDisplay value={payment.change_due} currency={ctx.organization.currency} />
                      ) : (
                        "—"
                      )}
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

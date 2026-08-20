import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PriceDisplay } from "@/components/shared/price-display";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage() {
  const ctx = await requireWorkspace("customers.view");
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .is("deleted_at", null)
    .order("full_name");

  const { data: orders } = await supabase
    .from("orders")
    .select("customer_id, total, amount_paid, balance, created_at, status")
    .eq("organization_id", ctx.organization.id)
    .neq("status", "cancelled");

  const stats = new Map<string, { purchased: number; paid: number; outstanding: number; last?: string }>();
  for (const order of orders ?? []) {
    const current = stats.get(order.customer_id) ?? { purchased: 0, paid: 0, outstanding: 0 };
    current.purchased += Number(order.total);
    current.paid += Number(order.amount_paid);
    current.outstanding += Number(order.balance);
    if (!current.last || order.created_at > current.last) current.last = order.created_at;
    stats.set(order.customer_id, current);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Balances, purchase history, and account status."
        actions={<Button render={<Link href="/dashboard/customers/new" />}>Add customer</Button>}
      />
      {(customers ?? []).length === 0 ? (
        <EmptyState title="No customers yet." description="Add a customer or share your store URL so they can register." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Purchased</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Last purchase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(customers ?? []).map((customer) => {
                const s = stats.get(customer.id);
                return (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Link href={`/dashboard/customers/${customer.id}`} className="font-medium hover:underline">
                        {customer.full_name}
                      </Link>
                    </TableCell>
                    <TableCell>{customer.email ?? "—"}</TableCell>
                    <TableCell>{customer.phone ?? "—"}</TableCell>
                    <TableCell className="capitalize">{customer.status}</TableCell>
                    <TableCell className="text-right">
                      <PriceDisplay value={s?.purchased ?? 0} currency={ctx.organization.currency} />
                    </TableCell>
                    <TableCell className="text-right">
                      <PriceDisplay value={s?.paid ?? 0} currency={ctx.organization.currency} />
                    </TableCell>
                    <TableCell className="text-right">
                      <PriceDisplay value={s?.outstanding ?? 0} currency={ctx.organization.currency} />
                    </TableCell>
                    <TableCell>{s?.last ? new Date(s.last).toLocaleDateString() : "—"}</TableCell>
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

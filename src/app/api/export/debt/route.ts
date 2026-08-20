import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function csv(rows: Array<Array<string | number | null | undefined>>) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell == null ? "" : String(cell);
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(",")
    )
    .join("\n");
}

export async function GET() {
  const ctx = await requireWorkspace("reports.view");
  const supabase = await createClient();
  const [{ data: customers }, { data: orders }] = await Promise.all([
    supabase.from("customers").select("id, full_name").eq("organization_id", ctx.organization.id).is("deleted_at", null),
    supabase
      .from("orders")
      .select("customer_id, total, amount_paid, balance, status")
      .eq("organization_id", ctx.organization.id),
  ]);

  const map = new Map<string, { name: string; purchased: number; paid: number; outstanding: number }>();
  for (const customer of customers ?? []) {
    map.set(customer.id, { name: customer.full_name, purchased: 0, paid: 0, outstanding: 0 });
  }
  for (const order of orders ?? []) {
    if (order.status === "cancelled") continue;
    const row = map.get(order.customer_id);
    if (!row) continue;
    row.purchased += Number(order.total);
    row.paid += Number(order.amount_paid);
    row.outstanding += Number(order.balance);
  }

  const body = csv([
    ["customer", "total_purchased", "total_paid", "outstanding"],
    ...[...map.values()].map((row) => [row.name, row.purchased, row.paid, row.outstanding]),
  ]);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="customer-debt.csv"',
    },
  });
}

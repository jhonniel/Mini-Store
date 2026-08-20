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
  const { data } = await supabase
    .from("orders")
    .select(
      "order_number, created_at, status, payment_status, total, amount_paid, balance, customers(full_name), order_items(profit)"
    )
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false });

  const body = csv([
    ["order_number", "date", "customer", "status", "payment_status", "total", "profit", "paid", "balance"],
    ...(data ?? []).map((row) => {
      const customer = row.customers as unknown as { full_name: string } | { full_name: string }[] | null;
      const name = Array.isArray(customer) ? customer[0]?.full_name : customer?.full_name;
      const items = row.order_items as Array<{ profit: string }> | null;
      const profit = (items ?? []).reduce((sum, item) => sum + Number(item.profit), 0);
      return [
        row.order_number,
        row.created_at,
        name,
        row.status,
        row.payment_status,
        row.total,
        profit.toFixed(2),
        row.amount_paid,
        row.balance,
      ];
    }),
  ]);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sales.csv"',
    },
  });
}

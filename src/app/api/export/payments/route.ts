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
  const ctx = await requireWorkspace("payments.view");
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("created_at, amount, payment_method, reference_number, customers(full_name)")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false });

  const body = csv([
    ["date", "customer", "method", "reference", "amount"],
    ...(data ?? []).map((row) => {
      const customer = row.customers as unknown as { full_name: string } | { full_name: string }[] | null;
      const name = Array.isArray(customer) ? customer[0]?.full_name : customer?.full_name;
      return [row.created_at, name, row.payment_method, row.reference_number, row.amount];
    }),
  ]);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="payments.csv"',
    },
  });
}

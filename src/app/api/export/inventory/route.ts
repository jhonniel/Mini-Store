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
  const ctx = await requireWorkspace("inventory.view");
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("name, current_stock, cost_price, selling_price, min_stock")
    .eq("organization_id", ctx.organization.id)
    .is("deleted_at", null);

  const body = csv([
    ["product", "stock", "cost", "selling_price", "inventory_value", "potential_profit"],
    ...(data ?? []).map((p) => [
      p.name,
      p.current_stock,
      p.cost_price,
      p.selling_price,
      Number(p.current_stock) * Number(p.cost_price),
      Number(p.current_stock) * (Number(p.selling_price) - Number(p.cost_price)),
    ]),
  ]);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="inventory.csv"',
    },
  });
}

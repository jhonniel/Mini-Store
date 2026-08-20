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

function download(filename: string, body: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET() {
  const ctx = await requireWorkspace("products.view");
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("name, sku, barcode, cost_price, selling_price, current_stock, min_stock, status, unit")
    .eq("organization_id", ctx.organization.id)
    .is("deleted_at", null)
    .order("name");

  const body = csv([
    ["name", "sku", "barcode", "cost_price", "selling_price", "current_stock", "min_stock", "status", "unit"],
    ...(data ?? []).map((p) => [
      p.name, p.sku, p.barcode, p.cost_price, p.selling_price, p.current_stock, p.min_stock, p.status, p.unit,
    ]),
  ]);
  return download("products.csv", body);
}

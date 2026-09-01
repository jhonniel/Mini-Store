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
    .select("name, selling_price, current_stock, categories(name)")
    .eq("organization_id", ctx.organization.id)
    .is("deleted_at", null)
    .order("name");

  const body = csv([
    ["Item name", "Category", "Price", "Quantity"],
    ...(data ?? []).map((product) => {
      const category = product.categories as { name: string } | { name: string }[] | null;
      const categoryName = Array.isArray(category) ? category[0]?.name : category?.name;
      return [product.name, categoryName ?? "", product.selling_price, product.current_stock];
    }),
  ]);
  return download("products.csv", body);
}

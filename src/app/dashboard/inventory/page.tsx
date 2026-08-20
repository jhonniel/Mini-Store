import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StockBadge } from "@/components/shared/status-badge";
import { PriceDisplay } from "@/components/shared/price-display";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/money";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import type { Product } from "@/types";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const ctx = await requireWorkspace("inventory.view");
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("name");

  let products = (data ?? []) as Product[];
  if (params.filter === "low") {
    products = products.filter((p) => Number(p.current_stock) > 0 && Number(p.current_stock) <= Number(p.min_stock));
  }
  if (params.filter === "out") {
    products = products.filter((p) => Number(p.current_stock) <= 0);
  }

  const value = products.reduce((sum, p) => sum + Number(p.current_stock) * Number(p.cost_price), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={`Stock value ${new Intl.NumberFormat("en-PH", { style: "currency", currency: ctx.organization.currency }).format(value)}`}
        actions={
          <div className="flex gap-2">
            <Button variant={params.filter === "low" ? "default" : "outline"} render={<Link href="/dashboard/inventory?filter=low" />}>
              Low stock
            </Button>
            <Button variant={params.filter === "out" ? "default" : "outline"} render={<Link href="/dashboard/inventory?filter=out" />}>
              Out of stock
            </Button>
          </div>
        }
      />
      {products.length === 0 ? (
        <EmptyState title="No inventory records." description="Add products to start tracking stock movements." actionHref="/dashboard/products/new" actionLabel="Add product" />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Link href={`/dashboard/inventory/${product.id}`} className="font-medium hover:underline">
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(product.current_stock, 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(product.min_stock, 0)}</TableCell>
                  <TableCell className="text-right">
                    <PriceDisplay
                      value={Number(product.current_stock) * Number(product.cost_price)}
                      currency={ctx.organization.currency}
                    />
                  </TableCell>
                  <TableCell>
                    <StockBadge current={product.current_stock} min={product.min_stock} />
                  </TableCell>
                  <TableCell className="text-right">
                    <AdjustStockDialog productId={product.id} productName={product.name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

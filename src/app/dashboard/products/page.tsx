import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PriceDisplay } from "@/components/shared/price-display";
import { ProductStatusBadge, StockBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatNumber, profitMargin, profitPerUnit } from "@/lib/money";
import { hasPermission } from "@/config/permissions";
import { ProductsToolbar } from "@/components/products/products-toolbar";
import type { Category, Product } from "@/types";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const ctx = await requireWorkspace("products.view");
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("*, categories(name)")
    .eq("organization_id", ctx.organization.id)
    .is("deleted_at", null);

  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,sku.ilike.%${params.q}%,barcode.ilike.%${params.q}%`);
  }
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params.category) {
    query = query.eq("category_id", params.category);
  }
  if (params.sort === "price") query = query.order("selling_price", { ascending: true });
  else if (params.sort === "stock") query = query.order("current_stock", { ascending: true });
  else query = query.order("name", { ascending: true });

  const [{ data: products }, { data: categories }] = await Promise.all([
    query,
    supabase
      .from("categories")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const canCreate = hasPermission(ctx.membership.role, ctx.membership.permissions, "products.create");
  const rows = (products ?? []) as Array<Product & { categories?: { name: string } | null }>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Catalog, pricing, and stock at a glance."
        actions={
          canCreate ? (
            <Button render={<Link href="/dashboard/products/new" />}>Add product</Button>
          ) : null
        }
      />
      <ProductsToolbar
        query={params.q ?? ""}
        status={params.status ?? "all"}
        category={params.category ?? ""}
        categories={(categories ?? []) as Category[]}
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No products yet."
          description="Add your first product to start managing your inventory."
          actionLabel={canCreate ? "Add product" : undefined}
          actionHref={canCreate ? "/dashboard/products/new" : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Selling</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Link href={`/dashboard/products/${product.id}`} className="font-medium hover:underline">
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.sku ?? "—"}</TableCell>
                  <TableCell>{product.categories?.name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <PriceDisplay value={product.cost_price} currency={ctx.organization.currency} />
                  </TableCell>
                  <TableCell className="text-right">
                    <PriceDisplay value={product.selling_price} currency={ctx.organization.currency} />
                  </TableCell>
                  <TableCell className="text-right text-emerald-600">
                    <PriceDisplay
                      value={profitPerUnit(product.selling_price, product.cost_price)}
                      currency={ctx.organization.currency}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {profitMargin(product.selling_price, product.cost_price).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="tabular-nums">{formatNumber(product.current_stock, 0)}</span>
                      <StockBadge current={product.current_stock} min={product.min_stock} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <ProductStatusBadge status={product.status} />
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

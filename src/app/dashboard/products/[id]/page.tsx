import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/products/product-form";
import { ProfitPreview } from "@/components/shared/price-display";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { archiveProduct, updateProduct } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriceDisplay } from "@/components/shared/price-display";
import { formatMoney, formatNumber } from "@/lib/money";
import { hasPermission } from "@/config/permissions";
import type { Category, Product } from "@/types";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireWorkspace("products.view");
  const supabase = await createClient();
  const [{ data: product }, { data: categories }, { data: history }, { data: salesRows }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .eq("organization_id", ctx.organization.id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .is("deleted_at", null),
    supabase
      .from("product_price_history")
      .select("*")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("order_items")
      .select("quantity, subtotal, profit, orders(status)")
      .eq("organization_id", ctx.organization.id)
      .eq("product_id", id),
  ]);

  if (!product) notFound();

  const realized = (salesRows ?? []).filter((row) => {
    const order = row.orders as { status?: string } | { status?: string }[] | null;
    const status = Array.isArray(order) ? order[0]?.status : order?.status;
    return status !== "cancelled";
  });
  const unitsSold = realized.reduce((sum, row) => sum + Number(row.quantity), 0);
  const salesRevenue = realized.reduce((sum, row) => sum + Number(row.subtotal), 0);
  const salesProfit = realized.reduce((sum, row) => sum + Number(row.profit), 0);
  const showProfit = hasPermission(ctx.membership.role, ctx.membership.permissions, "finance.view");

  async function action(formData: FormData) {
    "use server";
    return updateProduct(id, formData);
  }

  async function archive() {
    "use server";
    await archiveProduct(id);
    redirect("/dashboard/products");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={product.name}
        description="Editing this product does not change past sales. Historical cost stays on each order."
        actions={
          <form action={archive}>
            <Button variant="destructive">Archive</Button>
          </form>
        }
      />
      <ProfitPreview
        cost={product.cost_price}
        selling={product.selling_price}
        currency={ctx.organization.currency}
      />
      {showProfit ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Units sold</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatNumber(unitsSold, 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                <PriceDisplay value={salesRevenue} currency={ctx.organization.currency} />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Profit from sales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                <PriceDisplay value={salesProfit} currency={ctx.organization.currency} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {salesRevenue ? ((salesProfit / salesRevenue) * 100).toFixed(1) : "0.0"}% margin on sold units
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
      <ProductForm
        action={action}
        product={product as Product}
        categories={(categories ?? []) as Category[]}
        currency={ctx.organization.currency}
        includeStock={false}
      />
      <Card>
        <CardHeader>
          <CardTitle>Price history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(history ?? []).map((row) => (
            <div key={row.id} className="flex justify-between gap-4 text-muted-foreground">
              <span>{new Date(row.created_at).toLocaleString()}</span>
              <span>
                Cost {formatMoney(row.cost_price, ctx.organization.currency)} · Sell{" "}
                {formatMoney(row.selling_price, ctx.organization.currency)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

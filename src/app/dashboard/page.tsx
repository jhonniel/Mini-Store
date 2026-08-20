import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { PriceDisplay } from "@/components/shared/price-display";
import { StockBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dashboardRanges, type DateRangeKey } from "@/lib/constants";
import { requireWorkspace } from "@/lib/auth/session";
import { getDashboardMetrics } from "@/lib/queries/dashboard";
import { hasPermission } from "@/config/permissions";
import { formatNumber } from "@/lib/money";
import { ProfitChart, SalesChart } from "@/components/dashboard/charts";
import { ProductSalesTable } from "@/components/dashboard/product-sales-table";
import { RangeSelect } from "@/components/dashboard/range-select";

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={up ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
      {up ? "↑" : "↓"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = (dashboardRanges.some((r) => r.value === params.range) ? params.range : "30d") as DateRangeKey;
  const ctx = await requireWorkspace();
  const metrics = await getDashboardMetrics(ctx, range);
  const canFinance = hasPermission(ctx.membership.role, ctx.membership.permissions, "finance.view");
  const currency = ctx.organization.currency;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`${ctx.organization.name} · ${range} snapshot`}
        actions={<RangeSelect value={range} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canFinance ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  <PriceDisplay value={metrics.revenue} currency={currency} />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  vs previous <Delta value={metrics.changes.revenue} />
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  <PriceDisplay value={metrics.cost} currency={currency} />
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                  <PriceDisplay value={metrics.profit} currency={currency} />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  this period <Delta value={metrics.changes.profit} />
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  <PriceDisplay value={metrics.outstanding} currency={currency} />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  unpaid balances <Delta value={metrics.changes.outstanding} />
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Inventory value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              <PriceDisplay value={metrics.inventoryValue} currency={currency} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Potential profit <PriceDisplay value={metrics.potentialProfit} currency={currency} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total products</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatNumber(metrics.totalProducts)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Low stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-600">{formatNumber(metrics.lowStockCount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Out of stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-destructive">{formatNumber(metrics.outOfStockCount)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SalesChart data={metrics.salesSeries} currency={currency} />
        {canFinance ? (
          <ProfitChart
            revenue={metrics.revenue}
            cost={metrics.cost}
            profit={metrics.profit}
            currency={currency}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Top selling products</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {metrics.topSelling.map((item, i) => (
                  <li key={item.name} className="flex justify-between gap-4">
                    <span className="truncate">
                      {i + 1}. {item.name}
                    </span>
                    <span className="text-muted-foreground">{formatNumber(item.qty, 0)} sold</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{canFinance ? "Product sales and profit" : "Top selling products"}</CardTitle>
          </CardHeader>
          <CardContent>
            {canFinance ? (
              <ProductSalesTable rows={metrics.productSales.slice(0, 10)} currency={currency} />
            ) : metrics.topSelling.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet in this period.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {metrics.topSelling.map((item, i) => (
                  <li key={item.name} className="flex justify-between gap-4">
                    <span className="truncate">
                      {i + 1}. {item.name}
                    </span>
                    <span className="text-muted-foreground">{formatNumber(item.qty, 0)} sold</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Low stock products</CardTitle>
            <Link href="/dashboard/inventory?filter=low" className="text-sm text-primary">
              View all
            </Link>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Minimum</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.lowStock.slice(0, 6).map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(product.current_stock, 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(product.min_stock, 0)}</TableCell>
                    <TableCell>
                      <StockBadge current={product.current_stock} min={product.min_stock} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

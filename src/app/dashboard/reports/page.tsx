import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireWorkspace } from "@/lib/auth/session";
import { getDashboardMetrics } from "@/lib/queries/dashboard";
import { PriceDisplay } from "@/components/shared/price-display";
import { ProductSalesTable } from "@/components/dashboard/product-sales-table";

export default async function ReportsPage() {
  const ctx = await requireWorkspace("reports.view");
  const metrics = await getDashboardMetrics(ctx, "30d");
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Sales, profit, inventory, debt, and payments." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Revenue (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <PriceDisplay value={metrics.revenue} currency={ctx.organization.currency} className="text-2xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <PriceDisplay value={metrics.cost} currency={ctx.organization.currency} className="text-2xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gross profit</CardTitle>
          </CardHeader>
          <CardContent>
            <PriceDisplay value={metrics.profit} currency={ctx.organization.currency} className="text-2xl font-semibold" />
            <p className="mt-1 text-sm text-muted-foreground">
              Margin {metrics.revenue ? ((metrics.profit / metrics.revenue) * 100).toFixed(2) : "0.00"}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <PriceDisplay value={metrics.outstanding} currency={ctx.organization.currency} className="text-2xl font-semibold" />
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" render={<Link href="/api/export/sales" />}>Sales CSV</Button>
        <Button variant="outline" render={<Link href="/api/export/inventory" />}>Inventory CSV</Button>
        <Button variant="outline" render={<Link href="/api/export/debt" />}>Customer debt CSV</Button>
        <Button variant="outline" render={<Link href="/api/export/payments" />}>Payments CSV</Button>
        <Button variant="outline" render={<Link href="/api/export/products" />}>Products CSV</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Product sales and profit (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductSalesTable rows={metrics.productSales} currency={ctx.organization.currency} />
        </CardContent>
      </Card>
    </div>
  );
}

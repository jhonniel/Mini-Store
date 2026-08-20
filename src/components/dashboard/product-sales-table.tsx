import { PriceDisplay } from "@/components/shared/price-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/money";

export type ProductSaleRow = {
  id?: string | null;
  name: string;
  qty: number;
  revenue: number;
  profit: number;
};

export function ProductSalesTable({
  rows,
  currency,
}: {
  rows: ProductSaleRow[];
  currency: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No sales in this period yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Sold</TableHead>
            <TableHead className="text-right">Sales</TableHead>
            <TableHead className="text-right">Profit</TableHead>
            <TableHead className="text-right">Margin</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id ?? row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(row.qty, 0)}</TableCell>
              <TableCell className="text-right">
                <PriceDisplay value={row.revenue} currency={currency} />
              </TableCell>
              <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                <PriceDisplay value={row.profit} currency={currency} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.revenue ? ((row.profit / row.revenue) * 100).toFixed(1) : "0.0"}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

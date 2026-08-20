import { formatMoney, profitMargin, profitPerUnit } from "@/lib/money";
import { cn } from "@/lib/utils";

export function PriceDisplay({
  value,
  currency = "PHP",
  className,
}: {
  value: string | number | null | undefined;
  currency?: string;
  className?: string;
}) {
  return <span className={cn("tabular-nums", className)}>{formatMoney(value, currency)}</span>;
}

export function ProfitPreview({
  cost,
  selling,
  currency = "PHP",
}: {
  cost: string | number;
  selling: string | number;
  currency?: string;
}) {
  const profit = profitPerUnit(selling, cost);
  const margin = profitMargin(selling, cost);
  const positive = Number(profit) >= 0;

  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/40 p-3 text-sm">
      <div>
        <p className="text-muted-foreground">Cost price</p>
        <p className="font-medium tabular-nums">{formatMoney(cost, currency)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Selling price</p>
        <p className="font-medium tabular-nums">{formatMoney(selling, currency)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Profit</p>
        <p className={cn("font-medium tabular-nums", positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
          {formatMoney(profit, currency)}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">Margin</p>
        <p className="font-medium tabular-nums">{margin.toFixed(2)}%</p>
      </div>
    </div>
  );
}

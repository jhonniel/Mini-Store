"use client";

import { formatMoney } from "@/lib/money";
import { cashChange } from "@/lib/payments";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CashTenderFields({
  due,
  tendered,
  onTenderedChange,
  currency,
}: {
  due: number;
  tendered: string;
  onTenderedChange: (value: string) => void;
  currency: string;
}) {
  const given = Number(tendered || 0);
  const { change, short } = cashChange(given, due);

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <div className="flex justify-between text-sm">
        <span>Amount due</span>
        <span className="font-medium tabular-nums">{formatMoney(due, currency)}</span>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amountTendered">Cash received</Label>
        <Input
          id="amountTendered"
          name="amountTendered"
          type="number"
          step="0.01"
          min="0"
          required
          value={tendered}
          onChange={(e) => onTenderedChange(e.target.value)}
          placeholder="How much cash did the customer give?"
        />
      </div>
      {short > 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Still short {formatMoney(short, currency)}. Remaining will stay on the balance.
        </p>
      ) : (
        <div className="flex justify-between text-sm">
          <span>Change</span>
          <span className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatMoney(change, currency)}
          </span>
        </div>
      )}
    </div>
  );
}

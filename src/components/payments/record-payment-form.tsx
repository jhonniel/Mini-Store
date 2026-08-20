"use client";

import { useMemo, useState } from "react";
import { recordPayment } from "@/lib/actions/commerce";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/shared/submit-button";
import { CashTenderFields } from "@/components/payments/cash-tender-fields";
import { GCashDetails } from "@/components/payments/gcash-details";
import { formatMoney } from "@/lib/money";
import { isCashMethod, paymentKind } from "@/lib/payments";
import { toast } from "sonner";
import type { PaymentMethod } from "@/types";

export function RecordPaymentForm({
  customerId,
  orderId,
  methods,
  outstanding,
  currency,
}: {
  customerId: string;
  orderId?: string;
  methods: PaymentMethod[];
  outstanding: number;
  currency: string;
}) {
  const fallback: PaymentMethod[] = [
    {
      id: "cash",
      name: "Cash",
      kind: "cash",
      account_number: null,
      qr_code_url: null,
      is_active: true,
      sort_order: 1,
      organization_id: "",
    },
  ];
  const options = methods.length ? methods : fallback;
  const [methodId, setMethodId] = useState(options[0]?.id ?? "cash");
  const [tendered, setTendered] = useState("");
  const selected = options.find((method) => method.id === methodId) ?? options[0];
  const cash = selected ? isCashMethod(selected) : true;
  const amountDue = outstanding;

  const defaultAmount = useMemo(() => (amountDue > 0 ? String(amountDue) : ""), [amountDue]);

  return (
    <form
      className="space-y-3 rounded-xl border p-4"
      action={async (formData) => {
        formData.set("paymentMethod", selected?.name ?? "cash");
        formData.set("amountDue", String(amountDue));
        if (cash) formData.set("amount", String(amountDue));
        const result = await recordPayment(formData);
        if (result.error) toast.error(result.error);
        else toast.success(result.success);
      }}
    >
      <input type="hidden" name="customerId" value={customerId} />
      {orderId ? <input type="hidden" name="orderId" value={orderId} /> : null}
      <p className="text-sm text-muted-foreground">Outstanding {formatMoney(outstanding, currency)}</p>
      <div className="grid gap-2">
        <Label htmlFor="paymentMethod">Payment method</Label>
        <select
          id="paymentMethodSelect"
          className="h-8 rounded-lg border bg-transparent px-2.5 text-sm"
          value={methodId}
          onChange={(e) => setMethodId(e.target.value)}
        >
          {options.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
            </option>
          ))}
        </select>
      </div>
      {cash ? (
        <CashTenderFields due={amountDue} tendered={tendered} onTenderedChange={setTendered} currency={currency} />
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required defaultValue={defaultAmount} />
        </div>
      )}
      {selected && paymentKind(selected) === "gcash" ? (
        <>
          <GCashDetails method={selected} />
          <div className="grid gap-2">
            <Label htmlFor="referenceNumber">GCash reference number</Label>
            <Input id="referenceNumber" name="referenceNumber" />
          </div>
        </>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="referenceNumber">Reference number</Label>
          <Input id="referenceNumber" name="referenceNumber" />
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      <SubmitButton>Record payment</SubmitButton>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkout } from "@/lib/actions/commerce";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/shared/submit-button";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { GCashDetails } from "@/components/payments/gcash-details";
import { paymentKind } from "@/lib/payments";
import type { PaymentMethod } from "@/types";

export function CheckoutForm({
  slug,
  total,
  currency,
  allowPayLater,
  termsDays,
  methods,
}: {
  slug: string;
  total: number;
  currency: string;
  allowPayLater: boolean;
  termsDays: number;
  methods: PaymentMethod[];
}) {
  const router = useRouter();
  const [paymentType, setPaymentType] = useState("full");
  const [amountPaid, setAmountPaid] = useState(String(total));
  const [methodId, setMethodId] = useState(methods[0]?.id ?? "cash");
  const remaining = Math.max(total - Number(amountPaid || 0), 0);
  const selected = methods.find((method) => method.id === methodId);

  return (
    <form
      className="space-y-4"
      action={async (formData) => {
        formData.set("paymentType", paymentType);
        formData.set("paymentMethod", selected?.name ?? "cash");
        const result = await checkout(slug, formData);
        if ("error" in result && result.error) toast.error(result.error);
        else if ("order_id" in result) {
          toast.success(result.success);
          router.push(`/store/${slug}/orders/${result.order_id}`);
        }
      }}
    >
      <div className="rounded-xl border p-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatMoney(total, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount</span>
          <span>{formatMoney(0, currency)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatMoney(total, currency)}</span>
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Payment type</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={paymentType === "full"} onChange={() => { setPaymentType("full"); setAmountPaid(String(total)); }} />
          Fully paid
        </label>
        {allowPayLater ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={paymentType === "partial"} onChange={() => setPaymentType("partial")} />
              Partially paid
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={paymentType === "pay_later"} onChange={() => { setPaymentType("pay_later"); setAmountPaid("0"); }} />
              Pay later / credit
            </label>
          </>
        ) : null}
      </fieldset>
      {paymentType !== "full" ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="amountPaid">Amount paid</Label>
            <Input id="amountPaid" name="amountPaid" type="number" step="0.01" min="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
          </div>
          <p className="text-sm text-muted-foreground">Remaining balance {formatMoney(remaining, currency)}</p>
          <div className="grid gap-2">
            <Label htmlFor="dueDate">Due date</Label>
            <Input id="dueDate" name="dueDate" type="date" />
            <p className="text-xs text-muted-foreground">Defaults to {termsDays} days if left empty.</p>
          </div>
        </>
      ) : (
        <input type="hidden" name="amountPaid" value={total} />
      )}
      <div className="grid gap-2">
        <Label htmlFor="paymentMethod">Payment method</Label>
        <select
          id="paymentMethod"
          className="h-8 rounded-lg border bg-transparent px-2.5 text-sm"
          value={methodId}
          onChange={(e) => setMethodId(e.target.value)}
        >
          {(methods.length ? methods : [{ id: "cash", name: "Cash" }]).map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
            </option>
          ))}
        </select>
      </div>
      {selected && paymentKind(selected) === "gcash" ? (
        <>
          <GCashDetails method={selected} />
          <div className="grid gap-2">
            <Label htmlFor="notes">GCash reference</Label>
            <Input id="notes" name="notes" placeholder="Reference number after you send payment" />
          </div>
        </>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" />
        </div>
      )}
      <SubmitButton className="w-full">Place order</SubmitButton>
    </form>
  );
}

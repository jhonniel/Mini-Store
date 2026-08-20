"use client";

import { useMemo, useState } from "react";
import { adminPlaceOrder } from "@/lib/actions/commerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/shared/submit-button";
import { CashTenderFields } from "@/components/payments/cash-tender-fields";
import { GCashDetails } from "@/components/payments/gcash-details";
import { isCashMethod, paymentKind } from "@/lib/payments";
import type { PaymentMethod } from "@/types";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type ProductOption = { id: string; name: string; selling_price: string; current_stock: string };
type CustomerOption = { id: string; full_name: string };

export function AdminOrderForm({
  products,
  customers,
  methods,
  currency,
  allowPayLater,
}: {
  products: ProductOption[];
  customers: CustomerOption[];
  methods: PaymentMethod[];
  currency: string;
  allowPayLater: boolean;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [paymentType, setPaymentType] = useState(allowPayLater ? "pay_later" : "full");
  const [paymentMethodId, setPaymentMethodId] = useState(methods[0]?.id ?? "cash");
  const [amountPaid, setAmountPaid] = useState("0");
  const [tendered, setTendered] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [lines, setLines] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: products[0]?.id ?? "", quantity: 1 },
  ]);

  const items = lines
    .map((line) => {
      const product = products.find((p) => p.id === line.productId);
      if (!product) return null;
      return { product, quantity: line.quantity, subtotal: Number(product.selling_price) * line.quantity };
    })
    .filter(Boolean) as Array<{ product: ProductOption; quantity: number; subtotal: number }>;

  const total = useMemo(() => items.reduce((sum, item) => sum + Math.round(item.subtotal * 100), 0) / 100, [items]);
  const selectedMethod =
    methods.find((method) => method.id === paymentMethodId) ??
    methods.find((method) => method.name.toLowerCase() === "cash");
  const methodName = selectedMethod?.name ?? "cash";
  const cash = selectedMethod ? isCashMethod(selectedMethod) : isCashMethod(methodName);
  const due = paymentType === "full" ? total : Number(amountPaid || 0);

  return (
    <form
      className="space-y-6"
      action={async (formData) => {
        formData.set("items", JSON.stringify(lines.map((l) => ({ product_id: l.productId, quantity: l.quantity }))));
        formData.set("customerId", customerId);
        formData.set("paymentType", paymentType);
        formData.set("paymentMethod", methodName);
        if (paymentType === "full") formData.set("amountPaid", String(total));
        const result = await adminPlaceOrder(formData);
        if ("error" in result && result.error) toast.error(result.error);
        else if ("success" in result) {
          toast.success(result.success);
          router.push("/dashboard/orders");
        }
      }}
    >
      <div className="grid gap-2">
        <Label>Customer</Label>
        <Select value={customerId} onValueChange={(value) => setCustomerId(value ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3">
        {lines.map((line, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
            <Select
              value={line.productId}
              onValueChange={(value) => {
                const next = [...lines];
                next[index] = { ...line, productId: value ?? "" };
                setLines(next);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              value={line.quantity}
              onChange={(e) => {
                const next = [...lines];
                next[index] = { ...line, quantity: Number(e.target.value) };
                setLines(next);
              }}
            />
            <Button type="button" variant="ghost" onClick={() => setLines(lines.filter((_, i) => i !== index))}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => setLines([...lines, { productId: products[0]?.id ?? "", quantity: 1 }])}>
          Add item
        </Button>
      </div>
      <div className="grid gap-2">
        <Label>Payment type</Label>
        <Select value={paymentType} onValueChange={(value) => setPaymentType(value ?? "full")}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Fully paid</SelectItem>
            {allowPayLater ? <SelectItem value="partial">Partially paid</SelectItem> : null}
            {allowPayLater ? <SelectItem value="pay_later">Pay later / credit</SelectItem> : null}
          </SelectContent>
        </Select>
      </div>
      {paymentType !== "full" ? (
        <div className="grid gap-2">
          <Label htmlFor="amountPaid">Amount paid</Label>
          <Input
            id="amountPaid"
            name="amountPaid"
            type="number"
            step="0.01"
            min="0"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
          />
        </div>
      ) : (
        <input type="hidden" name="amountPaid" value={total} />
      )}
      <div className="grid gap-2">
        <Label>Payment method</Label>
        <Select value={paymentMethodId} onValueChange={(value) => setPaymentMethodId(value ?? methods[0]?.id ?? "cash")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            {(methods.length
              ? methods
              : [
                  {
                    id: "cash",
                    name: "Cash",
                    kind: "cash" as const,
                    account_number: null,
                    qr_code_url: null,
                    is_active: true,
                    sort_order: 1,
                    organization_id: "",
                  },
                ]
            ).map((method) => (
              <SelectItem key={method.id} value={method.id}>
                {method.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {cash && due > 0 ? (
        <CashTenderFields due={due} tendered={tendered} onTenderedChange={setTendered} currency={currency} />
      ) : null}
      {selectedMethod && paymentKind(selectedMethod) === "gcash" ? (
        <>
          <GCashDetails method={selectedMethod} />
          <div className="grid gap-2">
            <Label htmlFor="notes">GCash reference</Label>
            <Input
              id="notes"
              name="notes"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Reference number"
            />
          </div>
        </>
      ) : null}
      <div className="flex items-center justify-between rounded-xl border p-4">
        <span>Total</span>
        <span className="text-lg font-semibold">{formatMoney(total, currency)}</span>
      </div>
      <SubmitButton>Create sale</SubmitButton>
    </form>
  );
}

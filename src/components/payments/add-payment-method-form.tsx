"use client";

import { useState } from "react";
import { addPaymentMethod } from "@/lib/actions/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { ImageField } from "@/components/shared/image-field";
import { toast } from "sonner";
import type { PaymentMethod } from "@/types";

export function AddPaymentMethodForm({ gcash }: { gcash?: PaymentMethod | null }) {
  const [kind, setKind] = useState("cash");

  return (
    <form
      className="space-y-3 rounded-xl border p-4"
      action={async (formData) => {
        const result = await addPaymentMethod(formData);
        if (result.error) toast.error(result.error);
        else toast.success(result.success);
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="kind">Type</Label>
        <select
          id="kind"
          name="kind"
          className="h-8 rounded-lg border bg-transparent px-2.5 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="cash">Cash</option>
          <option value="gcash">GCash</option>
        </select>
      </div>
      <input type="hidden" name="name" value={kind === "gcash" ? "GCash" : "Cash"} />
      {kind === "gcash" ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="accountNumber">GCash account number</Label>
            <Input
              id="accountNumber"
              name="accountNumber"
              required
              placeholder="09XXXXXXXXX"
              defaultValue={gcash?.account_number ?? ""}
            />
          </div>
          <ImageField
            label="GCash QR code"
            fileField="qrCode"
            urlField="qrCodeUrl"
            currentUrl={gcash?.qr_code_url}
            hint="Upload your QR, or leave empty to generate one from the account number and save it to S3."
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          For cash sales, the cashier enters how much money was received and the system computes the change.
        </p>
      )}
      <SubmitButton>Add payment method</SubmitButton>
    </form>
  );
}

import { qrImageUrl } from "@/lib/payments";
import type { PaymentMethod } from "@/types";

export function GCashDetails({ method }: { method: Pick<PaymentMethod, "name" | "account_number" | "qr_code_url"> }) {
  const qr = qrImageUrl(method);
  if (!method.account_number && !qr) return null;

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4 text-sm">
      <p className="font-medium">{method.name} details</p>
      {method.account_number ? (
        <p>
          Account number <span className="font-mono font-semibold">{method.account_number}</span>
        </p>
      ) : null}
      {qr ? (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`${method.name} QR code`} className="size-44 rounded-lg border bg-white p-2" />
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">Ask the customer to send the payment, then save the reference number.</p>
    </div>
  );
}

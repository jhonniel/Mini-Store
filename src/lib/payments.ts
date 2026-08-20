import type { PaymentMethod, PaymentMethodKind } from "@/types";

export function paymentKind(method: Pick<PaymentMethod, "kind" | "name"> | string): PaymentMethodKind {
  if (typeof method === "string") {
    const name = method.toLowerCase();
    if (name === "cash") return "cash";
    if (name.includes("gcash")) return "gcash";
    return "other";
  }
  if (method.kind === "cash" || method.kind === "gcash") return method.kind;
  return paymentKind(method.name);
}

export function isCashMethod(method: Pick<PaymentMethod, "kind" | "name"> | string) {
  return paymentKind(method) === "cash";
}

export function cashChange(tendered: number, due: number) {
  const given = Number.isFinite(tendered) ? tendered : 0;
  const amountDue = Number.isFinite(due) ? due : 0;
  const applied = Math.min(Math.max(given, 0), Math.max(amountDue, 0));
  const change = Math.max(0, Math.round((given - amountDue) * 100) / 100);
  return { applied, change, short: Math.max(0, Math.round((amountDue - given) * 100) / 100) };
}

export function qrImageUrl(method: Pick<PaymentMethod, "account_number" | "qr_code_url">) {
  if (method.qr_code_url) return method.qr_code_url;
  if (method.account_number) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(method.account_number)}`;
  }
  return null;
}

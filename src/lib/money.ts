import { defaultCurrency, defaultLocale } from "@/config/brand";

export function toCents(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function addCents(...values: Array<string | number>): number {
  return values.reduce<number>((sum, value) => sum + toCents(value), 0);
}

export function formatMoney(
  value: string | number | null | undefined,
  currency = defaultCurrency,
  locale = defaultLocale
) {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(value: string | number | null | undefined, digits = 0) {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat(defaultLocale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function profitPerUnit(sellingPrice: string | number, costPrice: string | number) {
  return fromCents(toCents(sellingPrice) - toCents(costPrice));
}

export function profitMargin(sellingPrice: string | number, costPrice: string | number) {
  const selling = toCents(sellingPrice);
  if (selling === 0) return 0;
  return ((selling - toCents(costPrice)) / selling) * 100;
}

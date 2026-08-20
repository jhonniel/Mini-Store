"use client";

import { updateCartItem } from "@/lib/actions/commerce";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "@/components/shared/price-display";
import type { Product } from "@/types";
import { toast } from "sonner";

export function CartLine({
  slug,
  itemId,
  product,
  quantity,
  currency,
}: {
  slug: string;
  itemId: string;
  product: Product;
  quantity: number;
  currency: string;
}) {
  const subtotal = Number(product.selling_price) * quantity;
  async function change(next: number) {
    const result = await updateCartItem(slug, itemId, next);
    if (result.error) toast.error(result.error);
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{product.name}</p>
        <p className="text-sm text-muted-foreground">
          <PriceDisplay value={product.selling_price} currency={currency} /> × {quantity}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={() => change(quantity - 1)}>
          -
        </Button>
        <span className="w-8 text-center tabular-nums">{quantity}</span>
        <Button variant="outline" size="icon-sm" onClick={() => change(quantity + 1)}>
          +
        </Button>
        <Button variant="ghost" onClick={() => change(0)}>
          Remove
        </Button>
        <PriceDisplay value={subtotal} currency={currency} className="w-24 text-right font-medium" />
      </div>
    </div>
  );
}

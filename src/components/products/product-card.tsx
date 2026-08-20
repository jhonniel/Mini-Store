"use client";

import Link from "next/link";
import Image from "next/image";
import { PriceDisplay } from "@/components/shared/price-display";
import { StockRemaining } from "@/components/shared/status-badge";
import { toast } from "sonner";
import { addToCart } from "@/lib/actions/commerce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/types";

export function ProductCard({
  product,
  href,
  currency = "PHP",
  action,
}: {
  product: Product;
  href: string;
  currency?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="h-full">
      <Link href={href} className="block">
        <div className="relative aspect-square bg-muted">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <CardHeader>
          <CardTitle className="line-clamp-2">{product.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2">
          <PriceDisplay value={product.selling_price} currency={currency} className="text-base font-semibold" />
          <StockRemaining current={product.current_stock} />
        </CardContent>
      </Link>
      {action ? <CardFooter className="bg-transparent">{action}</CardFooter> : null}
    </Card>
  );
}

export function AddToCartButton({
  slug,
  productId,
  disabled,
}: {
  slug: string;
  productId: string;
  disabled?: boolean;
}) {
  return (
    <form
      action={async (formData) => {
        const result = await addToCart(slug, formData);
        if (result && "error" in result && result.error) toast.error(result.error);
      }}
      className="w-full"
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value="1" />
      <Button type="submit" className="w-full" disabled={disabled}>
        Add to cart
      </Button>
    </form>
  );
}

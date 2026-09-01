"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PriceDisplay } from "@/components/shared/price-display";
import { StockRemaining } from "@/components/shared/status-badge";
import { toast } from "sonner";
import { addToCart, buyNow } from "@/lib/actions/commerce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/shared/submit-button";
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

function loginHref(slug: string, productId: string) {
  return `/login?next=${encodeURIComponent(`/store/${slug}/products/${productId}`)}`;
}

export function AddToCartButton({
  slug,
  productId,
  disabled,
  signedIn = true,
}: {
  slug: string;
  productId: string;
  disabled?: boolean;
  signedIn?: boolean;
}) {
  const router = useRouter();

  if (!signedIn) {
    return (
      <Button className="w-full" render={<Link href={loginHref(slug, productId)} />} nativeButton={false}>
        Sign in to buy
      </Button>
    );
  }

  if (disabled) {
    return (
      <Button type="button" className="w-full" disabled>
        Out of stock
      </Button>
    );
  }

  return (
    <form
      action={async (formData) => {
        const result = await addToCart(slug, formData);
        if (result && "error" in result && result.error) toast.error(result.error);
        else {
          toast.success(result && "success" in result ? result.success : "Added to cart.");
          router.refresh();
        }
      }}
      className="w-full"
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value="1" />
      <SubmitButton className="w-full">Add to cart</SubmitButton>
    </form>
  );
}

export function PurchaseActions({
  slug,
  productId,
  maxQuantity,
  signedIn = true,
}: {
  slug: string;
  productId: string;
  maxQuantity: number;
  signedIn?: boolean;
}) {
  const router = useRouter();
  const inStock = maxQuantity > 0;

  if (!signedIn) {
    return (
      <Button className="w-full" size="lg" render={<Link href={loginHref(slug, productId)} />} nativeButton={false}>
        Sign in to buy
      </Button>
    );
  }

  if (!inStock) {
    return (
      <Button type="button" className="w-full" size="lg" disabled>
        Out of stock
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <form
        className="space-y-3"
        action={async (formData) => {
          const result = await addToCart(slug, formData);
          if (result && "error" in result && result.error) toast.error(result.error);
          else {
            toast.success(result && "success" in result ? result.success : "Added to cart.");
            router.refresh();
          }
        }}
      >
        <input type="hidden" name="productId" value={productId} />
        <label className="grid gap-1.5 text-sm font-medium">
          Quantity
          <input
            name="quantity"
            type="number"
            min={1}
            max={maxQuantity}
            defaultValue={1}
            className="h-10 w-28 rounded-lg border bg-transparent px-3 text-sm"
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SubmitButton className="flex-1">Add to cart</SubmitButton>
          <Button
            type="submit"
            className="flex-1"
            variant="outline"
            formAction={async (formData) => {
              const result = await buyNow(slug, formData);
              if (result && "error" in result && result.error) toast.error(result.error);
            }}
          >
            Buy now
          </Button>
        </div>
      </form>
    </div>
  );
}

import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/products/product-card";
import { PriceDisplay } from "@/components/shared/price-display";
import { StockRemaining } from "@/components/shared/status-badge";
import { getPublicStore } from "@/lib/auth/session";
import Image from "next/image";

export default async function ProductDetailStorePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { supabase, organization } = await getPublicStore(slug);
  if (!organization) notFound();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .eq("status", "active")
    .maybeSingle();
  if (!product) notFound();

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
        )}
      </div>
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">{product.name}</h1>
        <p className="text-2xl font-semibold">
          <PriceDisplay value={product.selling_price} currency={organization.currency} />
        </p>
        <StockRemaining current={product.current_stock} />
        <p className="text-muted-foreground">{product.description}</p>
        <p className="text-sm text-muted-foreground">
          SKU {product.sku ?? "—"} · {product.unit}
        </p>
        <AddToCartButton slug={slug} productId={product.id} disabled={Number(product.current_stock) <= 0} />
      </div>
    </div>
  );
}

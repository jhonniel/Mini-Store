import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { requireStoreCustomer } from "@/lib/auth/session";
import { clearCart } from "@/lib/actions/commerce";
import { CartLine } from "@/components/store/cart-line";
import { addCents, formatMoney } from "@/lib/money";
import type { CartItem, Product } from "@/types";

export default async function CartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireStoreCustomer(slug);
  const { data } = await ctx.supabase
    .from("cart_items")
    .select("*, products(*)")
    .eq("organization_id", ctx.organization.id)
    .eq("user_id", ctx.user.id);

  const items = (data ?? []) as Array<CartItem & { products: Product | null }>;
  const total = addCents(...items.map((item) => Number(item.products?.selling_price ?? 0) * Number(item.quantity))) / 100;

  async function clear() {
    "use server";
    await clearCart(slug);
  }

  if (!ctx.organization) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cart"
        actions={
          items.length ? (
            <form action={clear}>
              <Button variant="outline">Clear cart</Button>
            </form>
          ) : null
        }
      />
      {items.length === 0 ? (
        <EmptyState title="Your cart is empty." description="Browse products and add them to your list." actionHref={`/store/${slug}`} actionLabel="Browse products" />
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) =>
              item.products ? (
                <CartLine
                  key={item.id}
                  slug={slug}
                  itemId={item.id}
                  product={item.products}
                  quantity={Number(item.quantity)}
                  currency={ctx.organization.currency}
                />
              ) : null
            )}
          </div>
          <div className="flex items-center justify-between rounded-xl border p-4">
            <span>Total</span>
            <span className="text-xl font-semibold">{formatMoney(total, ctx.organization.currency)}</span>
          </div>
          <Button className="w-full" render={<Link href={`/store/${slug}/checkout`} />}>
            Checkout
          </Button>
        </>
      )}
    </div>
  );
}

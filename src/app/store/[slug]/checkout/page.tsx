import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { requireStoreCustomer } from "@/lib/auth/session";
import { addCents } from "@/lib/money";
import { CheckoutForm } from "@/components/store/checkout-form";
import type { PaymentMethod, Product } from "@/types";

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireStoreCustomer(slug);
  const [{ data }, { data: methods }] = await Promise.all([
    ctx.supabase
      .from("cart_items")
      .select("quantity, products(selling_price)")
      .eq("organization_id", ctx.organization.id)
      .eq("user_id", ctx.user.id),
    ctx.supabase
      .from("payment_methods")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const items = data ?? [];
  if (items.length === 0) {
    return <EmptyState title="Your cart is empty." description="Add products before checkout." actionHref={`/store/${slug}`} actionLabel="Browse products" />;
  }

  const total =
    addCents(
      ...items.map((item) => {
        const product = item.products as unknown as Product | Product[] | null;
        const price = Array.isArray(product) ? product[0]?.selling_price : product?.selling_price;
        return Number(price ?? 0) * Number(item.quantity);
      })
    ) / 100;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title="Checkout" description="Review your items and place your order." />
      <CheckoutForm
        slug={slug}
        total={total}
        currency={ctx.organization.currency}
        allowPayLater={ctx.settings?.allow_pay_later ?? true}
        termsDays={ctx.settings?.payment_terms_days ?? 7}
        methods={(methods ?? []) as PaymentMethod[]}
      />
    </div>
  );
}

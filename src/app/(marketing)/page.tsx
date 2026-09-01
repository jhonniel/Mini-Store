import Link from "next/link";
import { getDefaultStore } from "@/lib/auth/session";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductMenu } from "@/components/store/product-menu";
import type { Category, Product } from "@/types";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const query = await searchParams;
  let store: Awaited<ReturnType<typeof getDefaultStore>> | null = null;
  try {
    store = await getDefaultStore();
  } catch {
    store = null;
  }

  if (!store?.organization) {
    return (
      <EmptyState
        title="No products yet."
        description="Create a business and add products to start your menu."
        actionLabel="Create account"
        actionHref="/register"
      />
    );
  }

  const { supabase, organization } = store;
  const slug = organization.slug;
  const sort = query.sort || "category";

  let productsQuery = supabase
    .from("products")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("status", "active")
    .is("deleted_at", null);

  if (query.q) {
    const q = query.q.replace(/[%_,]/g, "");
    productsQuery = productsQuery.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`);
  }
  if (query.category) productsQuery = productsQuery.eq("category_id", query.category);
  if (sort === "price") productsQuery = productsQuery.order("selling_price");
  else productsQuery = productsQuery.order("name");

  const [{ data: products }, { data: categories }] = await Promise.all([
    productsQuery,
    supabase
      .from("categories")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Menu</h1>
        <p className="text-muted-foreground">
          Browse {organization.name} products. Filter by category or search by name.
        </p>
      </div>
      <ProductMenu
        products={(products ?? []) as Product[]}
        categories={(categories ?? []) as Category[]}
        query={query.q ?? ""}
        categoryId={query.category ?? ""}
        sort={sort}
        basePath="/"
        currency={organization.currency}
        storeSlug={slug}
        productHref={(product) => `/store/${slug}/products/${product.id}`}
        signedIn={Boolean(store.user)}
      />
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link className="underline" href={`/register?slug=${slug}`}>
          Create an account
        </Link>
      </p>
    </div>
  );
}

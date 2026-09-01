import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicStore, getUser } from "@/lib/auth/session";
import { ProductMenu } from "@/components/store/product-menu";
import type { Category, Product } from "@/types";

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const [{ supabase, organization }, { user }] = await Promise.all([getPublicStore(slug), getUser()]);
  if (!organization) notFound();

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
        <p className="text-muted-foreground">Browse products, add to your list, and pay now or later.</p>
      </div>
      <ProductMenu
        products={(products ?? []) as Product[]}
        categories={(categories ?? []) as Category[]}
        query={query.q ?? ""}
        categoryId={query.category ?? ""}
        sort={sort}
        basePath={`/store/${slug}`}
        currency={organization.currency}
        storeSlug={slug}
        productHref={(product) => `/store/${slug}/products/${product.id}`}
        signedIn={Boolean(user)}
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

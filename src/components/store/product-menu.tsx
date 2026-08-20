import { AddToCartButton, ProductCard } from "@/components/products/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductSearch } from "@/components/store/product-search";
import type { Category, Product } from "@/types";

export function ProductMenu({
  products,
  categories,
  query,
  categoryId,
  sort,
  basePath,
  currency,
  storeSlug,
  productHref,
}: {
  products: Product[];
  categories: Category[];
  query: string;
  categoryId: string;
  sort: string;
  basePath: string;
  currency: string;
  storeSlug: string;
  productHref: (product: Product) => string;
}) {
  const grouped = groupByCategory(products, categories, sort, categoryId);

  return (
    <div className="space-y-6">
      <ProductSearch
        basePath={basePath}
        query={query}
        category={categoryId}
        sort={sort || "category"}
        categories={categories}
      />
      {products.length === 0 ? (
        <EmptyState title="No products found." description="Try another search or category." />
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.id} className="space-y-4">
              {grouped.length > 1 || sort === "category" ? (
                <h2 className="text-lg font-semibold tracking-tight">{group.name}</h2>
              ) : null}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {group.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    href={productHref(product)}
                    currency={currency}
                    action={
                      <AddToCartButton
                        slug={storeSlug}
                        productId={product.id}
                        disabled={Number(product.current_stock) <= 0}
                      />
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByCategory(
  products: Product[],
  categories: Category[],
  sort: string,
  categoryId: string
) {
  if (categoryId || sort === "name" || sort === "price") {
    return [{ id: "all", name: "Menu", products }];
  }

  const byId = new Map(categories.map((category) => [category.id, category]));
  const buckets = new Map<string, Product[]>();
  for (const product of products) {
    const key = product.category_id && byId.has(product.category_id) ? product.category_id : "uncategorized";
    const list = buckets.get(key) ?? [];
    list.push(product);
    buckets.set(key, list);
  }

  const groups = categories
    .filter((category) => buckets.has(category.id))
    .map((category) => ({
      id: category.id,
      name: category.name,
      products: buckets.get(category.id) ?? [],
    }));

  const uncategorized = buckets.get("uncategorized");
  if (uncategorized?.length) {
    groups.push({ id: "uncategorized", name: "Other", products: uncategorized });
  }

  return groups.length ? groups : [{ id: "all", name: "Menu", products }];
}

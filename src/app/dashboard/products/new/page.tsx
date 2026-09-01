import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/products/product-form";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createProduct } from "@/lib/actions/products";
import type { Category } from "@/types";

export default async function NewProductPage() {
  const ctx = await requireWorkspace("products.create");
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .is("deleted_at", null)
    .order("name");

  async function action(formData: FormData) {
    "use server";
    const result = await createProduct(formData);
    if (result.error) return result;
    redirect("/dashboard/products");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Add product"
        description="Active items appear on the customer menu. Set a selling price and stock so customers can order."
      />
      <ProductForm action={action} categories={(categories ?? []) as Category[]} currency={ctx.organization.currency} />
    </div>
  );
}

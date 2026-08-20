import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { createCategory } from "@/lib/actions/products";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { ActionForm } from "@/components/shared/action-form";
import { Card, CardContent } from "@/components/ui/card";

export default async function CategoriesPage() {
  const ctx = await requireWorkspace("products.view");
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .is("deleted_at", null)
    .order("sort_order");

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description="Group products for faster browsing and reports." />
      <ActionForm action={createCategory} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Beverages" />
        </div>
        <div className="grid flex-1 gap-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" />
        </div>
        <SubmitButton>Add category</SubmitButton>
      </ActionForm>
      {(categories ?? []).length === 0 ? (
        <EmptyState title="No categories yet." description="Add a category such as Rice & Staples or Beverages." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(categories ?? []).map((category) => (
            <Card key={category.id}>
              <CardContent>
                <p className="font-medium">{category.name}</p>
                <p className="text-sm text-muted-foreground">{category.description || "No description"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

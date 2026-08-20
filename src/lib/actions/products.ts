"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/auth/session";
import { getErrorMessage, slugify } from "@/lib/utils";
import { categorySchema, inventoryAdjustSchema, productSchema } from "@/lib/validations/product";
import { takeUploadedImage } from "@/lib/s3";

export async function createCategory(formData: FormData) {
  const ctx = await requireWorkspace("products.create");
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create category." };
  }

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase.from("categories").insert({
    organization_id: ctx.organization.id,
    name: parsed.data.name,
    slug: slugify(parsed.data.name),
    description: parsed.data.description || null,
  });

  if (error) return { error: getErrorMessage(error, "Unable to create category.") };
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/categories");
  return { success: "Category created." };
}

export async function createProduct(formData: FormData) {
  const ctx = await requireWorkspace("products.create");
  const image = await takeUploadedImage(formData, ctx.organization.id, {
    fileField: "image",
    urlField: "imageUrl",
    folder: "products",
  });
  if (image.error) return { error: image.error };

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    barcode: formData.get("barcode") || undefined,
    categoryId: formData.get("categoryId") || "",
    description: formData.get("description") || undefined,
    imageUrl: image.url || undefined,
    unit: formData.get("unit") || "piece",
    costPrice: formData.get("costPrice"),
    sellingPrice: formData.get("sellingPrice"),
    currentStock: formData.get("currentStock") || 0,
    minStock: formData.get("minStock") || ctx.settings?.default_min_stock || 0,
    maxStock: formData.get("maxStock") || undefined,
    status: formData.get("status") || "active",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create product." };
  }

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const initialStock = parsed.data.currentStock ?? 0;

  const { data, error } = await supabase
    .from("products")
    .insert({
      organization_id: ctx.organization.id,
      category_id: parsed.data.categoryId || null,
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      barcode: parsed.data.barcode || null,
      description: parsed.data.description || null,
      image_url: parsed.data.imageUrl || null,
      unit: parsed.data.unit,
      cost_price: parsed.data.costPrice,
      selling_price: parsed.data.sellingPrice,
      current_stock: 0,
      min_stock: parsed.data.minStock,
      max_stock: parsed.data.maxStock || null,
      status: parsed.data.status,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: getErrorMessage(error, "Unable to create product. Please try again.") };
  }

  if (initialStock > 0) {
    const { error: stockError } = await supabase.rpc("adjust_inventory", {
      p_product_id: data.id,
      p_quantity: initialStock,
      p_type: "initial",
      p_notes: "Initial stock",
    });
    if (stockError) {
      return { error: getErrorMessage(stockError, "Product created, but initial stock could not be set.") };
    }
  }

  await supabase.from("audit_logs").insert({
    organization_id: ctx.organization.id,
    user_id: ctx.user.id,
    action: "product.created",
    entity_type: "product",
    entity_id: data.id,
    description: `Product ${parsed.data.name} created`,
  });

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/inventory");
  return { success: "Product created.", id: data.id };
}

export async function updateProduct(productId: string, formData: FormData) {
  const ctx = await requireWorkspace("products.edit");
  const image = await takeUploadedImage(formData, ctx.organization.id, {
    fileField: "image",
    urlField: "imageUrl",
    folder: "products",
  });
  if (image.error) return { error: image.error };

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    barcode: formData.get("barcode") || undefined,
    categoryId: formData.get("categoryId") || "",
    description: formData.get("description") || undefined,
    imageUrl: image.url || undefined,
    unit: formData.get("unit") || "piece",
    costPrice: formData.get("costPrice"),
    sellingPrice: formData.get("sellingPrice"),
    minStock: formData.get("minStock") || 0,
    maxStock: formData.get("maxStock") || undefined,
    status: formData.get("status") || "active",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update product." };
  }

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase
    .from("products")
    .update({
      category_id: parsed.data.categoryId || null,
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      barcode: parsed.data.barcode || null,
      description: parsed.data.description || null,
      image_url: parsed.data.imageUrl || null,
      unit: parsed.data.unit,
      cost_price: parsed.data.costPrice,
      selling_price: parsed.data.sellingPrice,
      min_stock: parsed.data.minStock,
      max_stock: parsed.data.maxStock || null,
      status: parsed.data.status,
    })
    .eq("id", productId)
    .eq("organization_id", ctx.organization.id);

  if (error) return { error: getErrorMessage(error, "Unable to update product. Please try again.") };

  await supabase.from("audit_logs").insert({
    organization_id: ctx.organization.id,
    user_id: ctx.user.id,
    action: "product.updated",
    entity_type: "product",
    entity_id: productId,
    description: `Product ${parsed.data.name} updated`,
  });

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${productId}`);
  return { success: "Product updated." };
}

export async function archiveProduct(productId: string) {
  const ctx = await requireWorkspace("products.delete");
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase
    .from("products")
    .update({ status: "archived", deleted_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("organization_id", ctx.organization.id);

  if (error) return { error: getErrorMessage(error, "Unable to archive product.") };

  await supabase.from("audit_logs").insert({
    organization_id: ctx.organization.id,
    user_id: ctx.user.id,
    action: "product.archived",
    entity_type: "product",
    entity_id: productId,
    description: "Product archived",
  });

  revalidatePath("/dashboard/products");
  return { success: "Product archived." };
}

export async function bulkArchiveProducts(productIds: string[]) {
  const ctx = await requireWorkspace("products.delete");
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase
    .from("products")
    .update({ status: "archived", deleted_at: new Date().toISOString() })
    .in("id", productIds)
    .eq("organization_id", ctx.organization.id);
  if (error) return { error: getErrorMessage(error, "Unable to archive products.") };
  revalidatePath("/dashboard/products");
  return { success: `${productIds.length} products archived.` };
}

export async function adjustInventory(formData: FormData) {
  await requireWorkspace("inventory.adjust");
  const parsed = inventoryAdjustSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    type: formData.get("type"),
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to adjust inventory." };
  }

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase.rpc("adjust_inventory", {
    p_product_id: parsed.data.productId,
    p_quantity: parsed.data.quantity,
    p_type: parsed.data.type,
    p_notes: parsed.data.notes || null,
  });
  if (error) return { error: getErrorMessage(error, "Unable to adjust inventory.") };
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/products");
  return { success: "Inventory updated." };
}

export async function importProductsCsv(rows: Array<Record<string, string>>) {
  const ctx = await requireWorkspace("products.create");
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  let created = 0;
  for (const row of rows) {
    const name = row.name || row.Name || row.product || row.Product;
    if (!name) continue;
    const { error } = await supabase.from("products").insert({
      organization_id: ctx.organization.id,
      name,
      sku: row.sku || row.SKU || null,
      barcode: row.barcode || row.Barcode || null,
      unit: row.unit || "piece",
      cost_price: Number(row.cost_price || row.cost || 0),
      selling_price: Number(row.selling_price || row.price || 0),
      current_stock: 0,
      min_stock: Number(row.min_stock || 0),
      status: "active",
    });
    if (!error) created += 1;
  }
  revalidatePath("/dashboard/products");
  return { success: `Imported ${created} products.` };
}

export async function seedCatalog() {
  const ctx = await requireWorkspace();
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase.rpc("seed_demo_catalog", { p_org: ctx.organization.id });
  if (error) return { error: getErrorMessage(error, "Unable to load sample products.") };
  revalidatePath("/dashboard");
  return { success: "Sample grocery catalog loaded." };
}
